import { useCallback, useEffect, useRef, useState } from 'react';
import { integrationConfigs } from '../config/integrations.config.ts';
import {
  type ZephyrConfig,
  type ZephyrDeployment,
  ZephyrIntegration,
  type ZephyrMicroFrontend,
} from '../integrations/zephyr.ts';

export interface UseZephyrOptions {
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
  autoInitialize?: boolean;
  enableRealTimeMetrics?: boolean;
  pollingInterval?: number;
}

export interface ZephyrState {
  isInitialized: boolean;
  isDeploying: boolean;
  error: string | null;
  deployments: ZephyrDeployment[];
  currentDeployment: ZephyrDeployment | null;
  microFrontends: ZephyrMicroFrontend[];
  metrics: ZephyrMetrics | null;
}

export interface ZephyrMetrics {
  performance: {
    p50: { fcp: number; lcp: number; tti: number };
    p75: { fcp: number; lcp: number; tti: number };
    p95: { fcp: number; lcp: number; tti: number };
  };
  availability: {
    uptime: number;
    errorRate: number;
  };
  usage: {
    requests: number;
    bandwidth: string;
    uniqueUsers: number;
  };
  cost?: {
    current: number;
    projected: number;
    breakdown: Record<string, number>;
  };
}

export interface UseZephyrReturn extends ZephyrState {
  initialize: () => Promise<void>;
  deploy: (options?: DeployOptions) => Promise<ZephyrDeployment>;
  rollback: (deploymentId: string) => Promise<boolean>;
  registerMicroFrontend: (mf: ZephyrMicroFrontend) => Promise<void>;
  createPreviewDeployment: (branch: string) => Promise<ZephyrDeployment>;
  getDeploymentStatus: (deploymentId: string) => Promise<ZephyrDeployment | undefined>;
  refreshMetrics: () => Promise<void>;
  watchDeployment: (
    deploymentId: string,
    callback: (deployment: ZephyrDeployment) => void
  ) => () => void;
}

interface DeployOptions {
  environment?: string;
  version?: string;
  branch?: string;
  ttl?: number;
}

export function useZephyr(options: UseZephyrOptions = {}): UseZephyrReturn {
  const {
    projectId = integrationConfigs.zephyr?.projectId,
    environment = integrationConfigs.zephyr?.environment || 'development',
    autoInitialize = true,
    enableRealTimeMetrics = true,
    pollingInterval = 5000,
  } = options;

  const [state, setState] = useState<ZephyrState>({
    isInitialized: false,
    isDeploying: false,
    error: null,
    deployments: [],
    currentDeployment: null,
    microFrontends: [],
    metrics: null,
  });

  const [integration, setIntegration] = useState<ZephyrIntegration | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deploymentWatchers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize Zephyr integration
  const initialize = useCallback(async () => {
    if (state.isInitialized || !projectId) return;

    setState((prev) => ({ ...prev, error: null }));

    try {
      const zephyrConfig: ZephyrConfig = {
        projectId,
        environment,
        ...integrationConfigs.zephyr,
      };

      const zephyrIntegration = new ZephyrIntegration(zephyrConfig);
      await zephyrIntegration.initialize();

      setIntegration(zephyrIntegration);
      setState((prev) => ({ ...prev, isInitialized: true }));

      // Start metrics polling if enabled
      if (enableRealTimeMetrics) {
        startMetricsPolling();
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize Zephyr',
      }));
    }
  }, [projectId, environment, state.isInitialized, enableRealTimeMetrics]);

  // Deploy to Zephyr Cloud
  const deploy = useCallback(
    async (deployOptions?: DeployOptions): Promise<ZephyrDeployment> => {
      if (!integration) {
        throw new Error('Zephyr not initialized');
      }

      setState((prev) => ({ ...prev, isDeploying: true, error: null }));

      try {
        const deployment = await integration.deploy({
          environment: deployOptions?.environment || environment,
          ...deployOptions,
        });

        setState((prev) => ({
          ...prev,
          isDeploying: false,
          deployments: [...prev.deployments, deployment],
          currentDeployment: deployment,
        }));

        return deployment;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isDeploying: false,
          error: error instanceof Error ? error.message : 'Deployment failed',
        }));
        throw error;
      }
    },
    [integration, environment]
  );

  // Rollback deployment
  const rollback = useCallback(
    async (deploymentId: string): Promise<boolean> => {
      if (!integration) {
        throw new Error('Zephyr not initialized');
      }

      try {
        const success = await integration.rollback(deploymentId);

        if (success) {
          setState((prev) => ({
            ...prev,
            deployments: prev.deployments.map((d) =>
              d.id === deploymentId ? { ...d, status: 'rolled-back' } : d
            ),
          }));
        }

        return success;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Rollback failed',
        }));
        return false;
      }
    },
    [integration]
  );

  // Register micro-frontend
  const registerMicroFrontend = useCallback(
    async (mf: ZephyrMicroFrontend): Promise<void> => {
      if (!integration) {
        throw new Error('Zephyr not initialized');
      }

      try {
        await integration.registerMicroFrontend(mf);
        setState((prev) => ({
          ...prev,
          microFrontends: [...prev.microFrontends, mf],
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to register micro-frontend',
        }));
        throw error;
      }
    },
    [integration]
  );

  // Create preview deployment
  const createPreviewDeployment = useCallback(
    async (branch: string): Promise<ZephyrDeployment> => {
      if (!integration) {
        throw new Error('Zephyr not initialized');
      }

      setState((prev) => ({ ...prev, isDeploying: true, error: null }));

      try {
        const deployment = await integration.createPreviewDeployment(branch);

        setState((prev) => ({
          ...prev,
          isDeploying: false,
          deployments: [...prev.deployments, deployment],
        }));

        return deployment;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isDeploying: false,
          error: error instanceof Error ? error.message : 'Preview deployment failed',
        }));
        throw error;
      }
    },
    [integration]
  );

  // Get deployment status
  const getDeploymentStatus = useCallback(
    async (deploymentId: string): Promise<ZephyrDeployment | undefined> => {
      if (!integration) {
        throw new Error('Zephyr not initialized');
      }

      return integration.getDeploymentStatus(deploymentId);
    },
    [integration]
  );

  // Refresh metrics
  const refreshMetrics = useCallback(async () => {
    if (!integration) return;

    try {
      const metrics = await integration.getMetrics();

      // Add cost calculation
      const cost = calculateCost(metrics);

      setState((prev) => ({
        ...prev,
        metrics: { ...metrics, cost },
      }));
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, [integration]);

  // Watch deployment status
  const watchDeployment = useCallback(
    (deploymentId: string, callback: (deployment: ZephyrDeployment) => void) => {
      if (!integration) {
        console.warn('Zephyr not initialized');
        return () => {};
      }

      // Poll deployment status
      const interval = setInterval(async () => {
        const deployment = await getDeploymentStatus(deploymentId);
        if (deployment) {
          callback(deployment);

          // Update state
          setState((prev) => ({
            ...prev,
            deployments: prev.deployments.map((d) => (d.id === deploymentId ? deployment : d)),
          }));

          // Stop watching if deployment is complete
          if (
            deployment.status === 'active' ||
            deployment.status === 'failed' ||
            deployment.status === 'rolled-back'
          ) {
            clearInterval(interval);
            deploymentWatchers.current.delete(deploymentId);
          }
        }
      }, 2000);

      deploymentWatchers.current.set(deploymentId, interval);

      return () => {
        clearInterval(interval);
        deploymentWatchers.current.delete(deploymentId);
      };
    },
    [integration, getDeploymentStatus]
  );

  // Start metrics polling
  const startMetricsPolling = useCallback(() => {
    if (metricsIntervalRef.current) return;

    refreshMetrics(); // Initial fetch

    metricsIntervalRef.current = setInterval(() => {
      refreshMetrics();
    }, pollingInterval);
  }, [refreshMetrics, pollingInterval]);

  // Stop metrics polling
  const stopMetricsPolling = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, []);

  // Calculate cost based on metrics
  const calculateCost = (metrics: any): ZephyrMetrics['cost'] => {
    const requestCost = metrics.usage.requests * 0.0000004; // $0.40 per million requests
    const bandwidthCost = Number.parseFloat(metrics.usage.bandwidth) * 0.08; // $0.08 per GB
    const storageCost = 10; // Base storage cost

    const current = requestCost + bandwidthCost + storageCost;
    const projected = current * 30; // Monthly projection

    return {
      current,
      projected,
      breakdown: {
        requests: requestCost,
        bandwidth: bandwidthCost,
        storage: storageCost,
      },
    };
  };

  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && !state.isInitialized) {
      initialize();
    }
  }, [autoInitialize, state.isInitialized, initialize]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopMetricsPolling();

      // Clear all deployment watchers
      deploymentWatchers.current.forEach((interval) => clearInterval(interval));
      deploymentWatchers.current.clear();
    };
  }, [stopMetricsPolling]);

  return {
    ...state,
    initialize,
    deploy,
    rollback,
    registerMicroFrontend,
    createPreviewDeployment,
    getDeploymentStatus,
    refreshMetrics,
    watchDeployment,
  };
}

// Convenience hooks for specific environments
export function useZephyrDevelopment(options?: Omit<UseZephyrOptions, 'environment'>) {
  return useZephyr({ ...options, environment: 'development' });
}

export function useZephyrStaging(options?: Omit<UseZephyrOptions, 'environment'>) {
  return useZephyr({ ...options, environment: 'staging' });
}

export function useZephyrProduction(options?: Omit<UseZephyrOptions, 'environment'>) {
  return useZephyr({ ...options, environment: 'production' });
}

// Hook for micro-frontend management
export function useZephyrMicroFrontends() {
  const { microFrontends, registerMicroFrontend, isInitialized } = useZephyr();

  const registerMultiple = useCallback(
    async (mfs: ZephyrMicroFrontend[]) => {
      for (const mf of mfs) {
        await registerMicroFrontend(mf);
      }
    },
    [registerMicroFrontend]
  );

  const findByName = useCallback(
    (name: string) => {
      return microFrontends.find((mf) => mf.name === name);
    },
    [microFrontends]
  );

  const findByVersion = useCallback(
    (version: string) => {
      return microFrontends.filter((mf) => mf.version === version);
    },
    [microFrontends]
  );

  return {
    microFrontends,
    registerMicroFrontend,
    registerMultiple,
    findByName,
    findByVersion,
    isReady: isInitialized,
  };
}
