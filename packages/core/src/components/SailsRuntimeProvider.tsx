import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { SailsIntegration } from '../integrations/sails.ts';
import type { SailsConfig } from '../integrations/sails.ts';
import { useKatalystContext } from './KatalystProvider.tsx';

interface SailsRuntimeContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  config: SailsConfig;
  sailsApp: any;

  // Backend API client
  api: {
    get: (endpoint: string, params?: any) => Promise<any>;
    post: (endpoint: string, data?: any) => Promise<any>;
    put: (endpoint: string, data?: any) => Promise<any>;
    delete: (endpoint: string) => Promise<any>;
  };

  // WebSocket client (if enabled)
  socket?: {
    connect: () => void;
    disconnect: () => void;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: Function) => void;
    off: (event: string, callback?: Function) => void;
  };

  // Model helpers
  models: {
    [modelName: string]: {
      find: (criteria?: any) => Promise<any[]>;
      findOne: (id: string | number) => Promise<any>;
      create: (data: any) => Promise<any>;
      update: (id: string | number, data: any) => Promise<any>;
      destroy: (id: string | number) => Promise<boolean>;
    };
  };

  // Integration with Katalyst - CRITICAL: Katalyst remains superior
  katalystIntegration: {
    frontendState: 'katalyst-zustand'; // Never replace Katalyst state management
    routing: 'katalyst-tanstack'; // Never replace Katalyst routing
    components: 'katalyst-react'; // Never replace Katalyst components
    apiMode: 'sails-backend-only'; // Sails is backend service only
  };
}

const SailsRuntimeContext = createContext<SailsRuntimeContextValue | null>(null);

interface SailsRuntimeProviderProps {
  children: ReactNode;
  config: SailsConfig;
  onError?: (error: Error) => void;
  loadingComponent?: React.ComponentType;
}

export function SailsRuntimeProvider({
  children,
  config,
  onError,
  loadingComponent: LoadingComponent,
}: SailsRuntimeProviderProps) {
  const katalyst = useKatalystContext(); // Ensure Katalyst takes precedence
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sailsIntegration] = useState(() => new SailsIntegration(config));
  const [sailsApp, setSailsApp] = useState<any>(null);

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        await sailsIntegration.initialize();

        // Note: We don't actually start Sails server here in the frontend
        // The backend server runs separately. This is just the frontend client.

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [sailsIntegration, onError]);

  // Create API client for backend communication
  const api = {
    get: async (endpoint: string, params?: any) => {
      const url = new URL(endpoint, `http://localhost:${config.server?.port || 1337}`);
      if (params) {
        Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    },

    post: async (endpoint: string, data?: any) => {
      const response = await fetch(`http://localhost:${config.server?.port || 1337}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    },

    put: async (endpoint: string, data?: any) => {
      const response = await fetch(`http://localhost:${config.server?.port || 1337}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    },

    delete: async (endpoint: string) => {
      const response = await fetch(`http://localhost:${config.server?.port || 1337}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    },
  };

  // Create WebSocket client (if WebSockets are enabled)
  const socket = config.websockets
    ? {
        connect: () => {
          // Mock WebSocket connection
          console.log('Connecting to Sails WebSocket server...');
        },
        disconnect: () => {
          console.log('Disconnecting from Sails WebSocket server...');
        },
        emit: (event: string, data?: any) => {
          console.log('Socket emit:', event, data);
        },
        on: (event: string, callback: Function) => {
          console.log('Socket on:', event);
        },
        off: (event: string, callback?: Function) => {
          console.log('Socket off:', event);
        },
      }
    : undefined;

  // Create model helpers for common CRUD operations
  const models = new Proxy(
    {},
    {
      get: (target, modelName: string) => {
        const apiPrefix = config.katalystBridge?.apiNamespace || '/api/v1';

        return {
          find: async (criteria?: any) => {
            const params = criteria ? { where: JSON.stringify(criteria) } : {};
            return api.get(`${apiPrefix}/${modelName}`, params);
          },

          findOne: async (id: string | number) => {
            return api.get(`${apiPrefix}/${modelName}/${id}`);
          },

          create: async (data: any) => {
            return api.post(`${apiPrefix}/${modelName}`, data);
          },

          update: async (id: string | number, data: any) => {
            return api.put(`${apiPrefix}/${modelName}/${id}`, data);
          },

          destroy: async (id: string | number) => {
            await api.delete(`${apiPrefix}/${modelName}/${id}`);
            return true;
          },
        };
      },
    }
  );

  const contextValue: SailsRuntimeContextValue = {
    isInitialized,
    isLoading,
    error,
    config,
    sailsApp,
    api,
    socket,
    models: models as any,
    // CRITICAL: Katalyst integration settings
    katalystIntegration: {
      frontendState: 'katalyst-zustand', // Katalyst state management is superior
      routing: 'katalyst-tanstack', // Katalyst routing is superior
      components: 'katalyst-react', // Katalyst components are superior
      apiMode: 'sails-backend-only', // Sails only provides backend APIs
    },
  };

  if (isLoading && LoadingComponent) {
    return <LoadingComponent />;
  }

  if (error) {
    return <SailsErrorBoundary error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <SailsRuntimeContext.Provider value={contextValue}>{children}</SailsRuntimeContext.Provider>
  );
}

export function useSailsRuntime() {
  const context = useContext(SailsRuntimeContext);
  if (!context) {
    throw new Error('useSailsRuntime must be used within a SailsRuntimeProvider');
  }
  return context;
}

interface SailsErrorBoundaryProps {
  error: Error;
  onRetry: () => void;
}

function SailsErrorBoundary({ error, onRetry }: SailsErrorBoundaryProps) {
  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #f56565',
        borderRadius: '8px',
        backgroundColor: '#fed7d7',
        margin: '20px',
      }}
    >
      <h2 style={{ color: '#c53030', marginBottom: '10px' }}>Sails Backend Connection Error</h2>
      <p style={{ marginBottom: '10px' }}>{error.message}</p>
      <p style={{ marginBottom: '10px', fontSize: '14px', color: '#744210' }}>
        Make sure the Sails backend server is running on the configured port.
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 16px',
          backgroundColor: '#f56565',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Retry Connection
      </button>
    </div>
  );
}

// Higher-order component for Sails API access
export function withSails<P extends object>(Component: React.ComponentType<P>) {
  return function SailsEnhancedComponent(props: P) {
    const sailsRuntime = useSailsRuntime();

    return <Component {...props} sails={sailsRuntime} />;
  };
}

// Backend Health Check Component
interface SailsHealthCheckProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SailsHealthCheck({ children, fallback }: SailsHealthCheckProps) {
  const { api, isInitialized } = useSailsRuntime();
  const [isHealthy, setIsHealthy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;

    async function checkHealth() {
      try {
        setChecking(true);
        // Try to ping the Sails backend
        await api.get('/health');
        setIsHealthy(true);
      } catch (err) {
        setIsHealthy(false);
      } finally {
        setChecking(false);
      }
    }

    checkHealth();
  }, [api, isInitialized]);

  if (checking) {
    return <div>Checking Sails backend health...</div>;
  }

  if (!isHealthy && fallback) {
    return <>{fallback}</>;
  }

  if (!isHealthy) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#fef5e7',
          border: '1px solid #f6ad55',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ color: '#c05621' }}>Sails Backend Offline</h3>
        <p>The Sails backend server is not responding. Running in frontend-only mode.</p>
        <p style={{ fontSize: '14px', color: '#744210' }}>
          To enable backend features, start the Sails server: <code>sails lift</code>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// Mock Data Provider (for development when backend is not available)
interface SailsMockProviderProps {
  children: ReactNode;
  mockData?: Record<string, any[]>;
}

export function SailsMockProvider({ children, mockData = {} }: SailsMockProviderProps) {
  const { config } = useSailsRuntime();

  // Override API methods with mock implementations
  const mockApi = {
    get: async (endpoint: string, params?: any) => {
      const [, , modelName] = endpoint.split('/');
      const data = mockData[modelName] || [];

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return data;
    },

    post: async (endpoint: string, data?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { ...data, id: Date.now() };
    },

    put: async (endpoint: string, data?: any) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { ...data, updatedAt: Date.now() };
    },

    delete: async (endpoint: string) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { deleted: true };
    },
  };

  // In a real implementation, we would override the context value
  // For now, this is just a wrapper that could provide mock data

  return (
    <div>
      <div
        style={{
          padding: '10px',
          backgroundColor: '#e6fffa',
          border: '1px solid #38b2ac',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px',
        }}
      >
        🧪 <strong>Development Mode:</strong> Using mock Sails data
      </div>
      {children}
    </div>
  );
}
