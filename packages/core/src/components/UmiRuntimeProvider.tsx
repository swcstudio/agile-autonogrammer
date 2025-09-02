import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { UmiIntegration } from '../integrations/umi.ts';
import type { UmiConfig, UmiRoute } from '../integrations/umi.ts';
import { useKatalystContext } from './KatalystProvider.tsx';

interface UmiRuntimeContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  config: UmiConfig;
  routes: UmiRoute[];
  plugins: Map<string, any>;
  // UMI features that complement Katalyst (not replace)
  antd?: {
    theme: any;
    locale: string;
  };
  i18n?: {
    locale: string;
    setLocale: (locale: string) => void;
    formatMessage: (descriptor: any, values?: any) => string;
  };
  request?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any, options?: any> => Promise<any>;
    put: (url: string, data?: any, options?: any) => Promise<any>;
    delete: (url: string, options?: any) => Promise<any>;
  };
  // Bridge to Katalyst state management (no DVA override)
  katalystIntegration: {
    preserveKatalystStores: boolean;
    bridgeMode: boolean;
  };
}

const UmiRuntimeContext = createContext<UmiRuntimeContextValue | null>(null);

interface UmiRuntimeProviderProps {
  children: ReactNode;
  config: UmiConfig;
  onError?: (error: Error) => void;
  loadingComponent?: React.ComponentType;
}

export function UmiRuntimeProvider({
  children,
  config,
  onError,
  loadingComponent: LoadingComponent
}: UmiRuntimeProviderProps) {
  const katalyst = useKatalystContext(); // Ensure Katalyst takes precedence
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [umiIntegration] = useState(() => new UmiIntegration(config));
  const [routes, setRoutes] = useState<UmiRoute[]>([]);
  const [plugins] = useState(() => new Map<string, any>());

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        await umiIntegration.initialize();
        
        // Extract routes from config or generate convention routes
        if (config.routes) {
          setRoutes(config.routes);
        } else {
          // In a real implementation, this would scan the file system
          setRoutes([]);
        }
        
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
  }, [umiIntegration, config.routes, onError]);

  // NOTE: NO DVA integration - Katalyst's state management is superior

  // Mock Ant Design integration
  const antdAPI = config.antd ? {
    theme: typeof config.antd === 'object' ? config.antd.theme : {},
    locale: 'en-US'
  } : undefined;

  // Mock i18n integration
  const i18nAPI = config.locale ? {
    locale: typeof config.locale === 'object' ? config.locale.default || 'en-US' : 'en-US',
    setLocale: (locale: string) => {
      console.log('Set locale:', locale);
    },
    formatMessage: (descriptor: any, values?: any) => {
      return descriptor.defaultMessage || descriptor.id || '';
    }
  } : undefined;

  // Mock request integration
  const requestAPI = config.request ? {
    get: async (url: string, options?: any) => {
      console.log('GET request:', url, options);
      return {};
    },
    post: async (url: string, data?: any, options?: any) => {
      console.log('POST request:', url, data, options);
      return {};
    },
    put: async (url: string, data?: any, options?: any) => {
      console.log('PUT request:', url, data, options);
      return {};
    },
    delete: async (url: string, options?: any) => {
      console.log('DELETE request:', url, options);
      return {};
    }
  } : undefined;

  const contextValue: UmiRuntimeContextValue = {
    isInitialized,
    isLoading,
    error,
    config,
    routes,
    plugins,
    antd: antdAPI,
    i18n: i18nAPI,
    request: requestAPI,
    katalystIntegration: {
      preserveKatalystStores: true,
      bridgeMode: true
    }
  };

  if (isLoading && LoadingComponent) {
    return <LoadingComponent />;
  }

  if (error) {
    return <UmiErrorBoundary error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <UmiRuntimeContext.Provider value={contextValue}>
      {children}
    </UmiRuntimeContext.Provider>
  );
}

export function useUmiRuntime() {
  const context = useContext(UmiRuntimeContext);
  if (!context) {
    throw new Error('useUmiRuntime must be used within a UmiRuntimeProvider');
  }
  return context;
}

interface UmiErrorBoundaryProps {
  error: Error;
  onRetry: () => void;
}

function UmiErrorBoundary({ error, onRetry }: UmiErrorBoundaryProps) {
  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ff4d4f', 
      borderRadius: '8px',
      backgroundColor: '#fff2f0',
      margin: '20px'
    }}>
      <h2 style={{ color: '#ff4d4f', marginBottom: '10px' }}>UMI Runtime Error</h2>
      <p style={{ marginBottom: '10px' }}>{error.message}</p>
      <button 
        onClick={onRetry}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff4d4f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
    </div>
  );
}

// UMI Convention Route Component
interface UmiRouteProps {
  path: string;
  component?: React.ComponentType<any>;
  exact?: boolean;
  children?: ReactNode;
}

export function UmiRoute({ children }: UmiRouteProps) {
  // In a real implementation, this would handle UMI routing
  return <>{children}</>;
}

// UMI Layout Component
interface UmiLayoutProps {
  children: ReactNode;
  title?: string;
  logo?: string;
  navTheme?: 'light' | 'dark';
  layout?: 'side' | 'top' | 'mix';
}

export function UmiLayout({ 
  children, 
  title = 'UMI App',
  logo,
  navTheme = 'dark',
  layout = 'side'
}: UmiLayoutProps) {
  const { config } = useUmiRuntime();
  
  if (!config.layout) {
    return <>{children}</>;
  }

  return (
    <div 
      style={{ 
        display: 'flex',
        flexDirection: layout === 'top' ? 'column' : 'row',
        minHeight: '100vh'
      }}
    >
      {/* Sidebar or Top Navigation */}
      <div 
        style={{
          width: layout === 'side' ? '200px' : '100%',
          height: layout === 'top' ? '60px' : '100vh',
          backgroundColor: navTheme === 'dark' ? '#001529' : '#ffffff',
          color: navTheme === 'dark' ? '#ffffff' : '#000000',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {logo && <img src={logo} alt="Logo" style={{ width: '32px', height: '32px', marginRight: '8px' }} />}
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{title}</span>
        </div>
        {/* Navigation items would go here */}
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

// UMI Model Provider (for DVA)
interface UmiModelProviderProps {
  children: ReactNode;
  models?: any[];
}

export function UmiModelProvider({ children, models = [] }: UmiModelProviderProps) {
  const { dva } = useUmiRuntime();
  
  useEffect(() => {
    if (dva && models.length > 0) {
      // In a real implementation, this would register DVA models
      console.log('Registering DVA models:', models);
    }
  }, [dva, models]);

  return <>{children}</>;
}

// UMI Locale Provider (for i18n)
interface UmiLocaleProviderProps {
  children: ReactNode;
  locale?: string;
  messages?: Record<string, any>;
}

export function UmiLocaleProvider({ 
  children, 
  locale = 'en-US',
  messages = {}
}: UmiLocaleProviderProps) {
  const { i18n } = useUmiRuntime();
  
  useEffect(() => {
    if (i18n && locale !== i18n.locale) {
      i18n.setLocale(locale);
    }
  }, [i18n, locale]);

  return <>{children}</>;
}

// UMI Access Provider (for permissions)
interface UmiAccessProviderProps {
  children: ReactNode;
  access?: Record<string, boolean>;
}

export function UmiAccessProvider({ children, access = {} }: UmiAccessProviderProps) {
  // In a real implementation, this would handle access control
  return <>{children}</>;
}

// UMI Request Provider (for API calls)
interface UmiRequestProviderProps {
  children: ReactNode;
  baseURL?: string;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config: any) => any;
    response?: (response: any) => any;
    error?: (error: any) => any;
  };
}

export function UmiRequestProvider({ 
  children, 
  baseURL,
  headers,
  interceptors
}: UmiRequestProviderProps) {
  const { request } = useUmiRuntime();
  
  useEffect(() => {
    if (request && interceptors) {
      // In a real implementation, this would set up request interceptors
      console.log('Setting up request interceptors');
    }
  }, [request, interceptors]);

  return <>{children}</>;
}

// Higher-order component for UMI features
export function withUmi<P extends object>(
  Component: React.ComponentType<P>
) {
  return function UmiEnhancedComponent(props: P) {
    const umiRuntime = useUmiRuntime();
    
    return <Component {...props} umi={umiRuntime} />;
  };
}

// UMI Plugin Container
interface UmiPluginContainerProps {
  children: ReactNode;
  pluginKey: string;
  plugin: any;
}

export function UmiPluginContainer({ 
  children, 
  pluginKey, 
  plugin 
}: UmiPluginContainerProps) {
  const { plugins } = useUmiRuntime();
  
  useEffect(() => {
    plugins.set(pluginKey, plugin);
    
    return () => {
      plugins.delete(pluginKey);
    };
  }, [plugins, pluginKey, plugin]);

  return <>{children}</>;
}