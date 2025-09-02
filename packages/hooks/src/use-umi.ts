import { useCallback, useEffect, useRef, useState } from 'react';
import { useKatalystContext } from '../components/KatalystProvider.tsx';
import { useUmiRuntime } from '../components/UmiRuntimeProvider.tsx';
import type { 
  AccessAPI,
  LocaleAPI,
  RequestConfig, 
  RequestResponse,
  UmiConfig, 
  UmiRoute, 
  UseRequestOptions,
  UseRequestResult
} from '../types/umi';

interface UseUmiOptions {
  onError?: (error: Error) => void;
  onSuccess?: (result: any) => void;
}

export function useUmi(options: UseUmiOptions = {}) {
  const runtime = useUmiRuntime();
  const katalyst = useKatalystContext(); // Ensure Katalyst takes precedence
  const { onError, onSuccess } = options;

  const navigate = useCallback((path: string | { pathname: string; search?: string; hash?: string; state?: any }) => {
    if (typeof path === 'string') {
      console.log('Navigate to:', path);
    } else {
      console.log('Navigate to:', path.pathname, path);
    }
    // In real implementation, this would use UMI's history
  }, []);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    isInitialized: runtime.isInitialized,
    config: runtime.config,
    routes: runtime.routes,
    navigate,
    refresh,
    // NOTE: No DVA - Katalyst state management is superior
    antd: runtime.antd,
    i18n: runtime.i18n,
    request: runtime.request,
    katalyst // Expose Katalyst context for integration
  };
}

// UMI Model Hook - Bridges to Katalyst stores (does NOT use DVA)
export function useModel<T = any>(namespace: string): T & {
  loading: boolean;
  update: (data: Partial<T>) => void;
} {
  const katalyst = useKatalystContext();
  const [state, setState] = useState<T>({} as T);
  const [loading, setLoading] = useState(false);

  // Bridge UMI model concept to Katalyst's better state management
  const update = useCallback((data: Partial<T>) => {
    setLoading(true);
    setState(prev => ({ ...prev, ...data }));
    // In real implementation, this would bridge to Katalyst stores
    console.log('UMI model bridging to Katalyst store:', namespace, data);
    setTimeout(() => setLoading(false), 100);
  }, [namespace]);

  useEffect(() => {
    // Bridge to Katalyst stores, not DVA
    console.log('UMI model bridging to Katalyst for namespace:', namespace);
  }, [namespace]);

  return {
    ...state,
    loading,
    update // Use 'update' instead of 'dispatch' to be clear this isn't DVA
  };
}

// Request Hook (similar to ahooks useRequest)
export function useRequest<T = any>(
  service: (...args: any[]) => Promise<T>,
  options: UseRequestOptions<T> = {}
): UseRequestResult<T> {
  const [data, setData] = useState<T | undefined>(options.defaultParams ? undefined : undefined);
  const [error, setError] = useState<any>(undefined);
  const [loading, setLoading] = useState(!options.manual);
  const { request } = useUmiRuntime();
  
  const serviceRef = useRef(service);
  serviceRef.current = service;

  const run = useCallback(async (...params: any[]): Promise<T> => {
    if (options.onBefore) {
      options.onBefore(params);
    }

    setLoading(true);
    setError(undefined);

    try {
      const result = await serviceRef.current(...params);
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result, params);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (options.onError) {
        options.onError(err as any, params);
      }
      
      throw err;
    } finally {
      setLoading(false);
      
      if (options.onFinally) {
        options.onFinally(params, data, error);
      }
    }
  }, [options, data, error]);

  const runAsync = useCallback(async (...params: any[]): Promise<T> => {
    return run(...params);
  }, [run]);

  const refresh = useCallback(async (): Promise<T> => {
    return run();
  }, [run]);

  const refreshAsync = useCallback(async (): Promise<T> => {
    return runAsync();
  }, [runAsync]);

  const mutate = useCallback((newData?: T | ((oldData?: T) => T)) => {
    if (typeof newData === 'function') {
      setData((oldData) => (newData as Function)(oldData));
    } else {
      setData(newData);
    }
  }, []);

  const cancel = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!options.manual) {
      run(...(options.defaultParams || []));
    }
  }, []);

  useEffect(() => {
    if (options.refreshDeps) {
      if (options.refreshDepsAction) {
        options.refreshDepsAction();
      } else {
        refresh();
      }
    }
  }, options.refreshDeps || []);

  return {
    data,
    error,
    loading,
    run,
    runAsync,
    refresh,
    refreshAsync,
    mutate,
    cancel
  };
}

// Locale Hook
export function useIntl(): LocaleAPI {
  const { i18n } = useUmiRuntime();
  const [locale, setLocaleState] = useState(i18n?.locale || 'en-US');

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    if (i18n) {
      i18n.setLocale(newLocale);
    }
  }, [i18n]);

  const formatMessage = useCallback((descriptor: any, values?: any) => {
    if (i18n) {
      return i18n.formatMessage(descriptor, values);
    }
    return descriptor.defaultMessage || descriptor.id || '';
  }, [i18n]);

  const getAllLocales = useCallback(() => {
    return ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR'];
  }, []);

  return {
    locale,
    setLocale,
    formatMessage,
    getAllLocales
  };
}

// Access Control Hook
export function useAccess(): AccessAPI {
  const [access] = useState<AccessAPI>({
    canRead: true,
    canWrite: true,
    canDelete: false,
    isAdmin: false
  });

  return access;
}

// Route Hook
export function useRoute() {
  const { routes } = useUmiRuntime();
  const [currentRoute, setCurrentRoute] = useState<UmiRoute | null>(null);

  useEffect(() => {
    // In real implementation, this would get current route from router
    const path = window.location.pathname;
    const route = routes.find(r => r.path === path);
    setCurrentRoute(route || null);
  }, [routes]);

  return {
    currentRoute,
    routes,
    params: {},
    query: {},
    location: {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: null
    }
  };
}

// History Hook
export function useHistory() {
  const push = useCallback((path: string | { pathname: string; search?: string; hash?: string; state?: any }) => {
    if (typeof path === 'string') {
      window.history.pushState({}, '', path);
    } else {
      const url = path.pathname + (path.search || '') + (path.hash || '');
      window.history.pushState(path.state || {}, '', url);
    }
  }, []);

  const replace = useCallback((path: string | { pathname: string; search?: string; hash?: string; state?: any }) => {
    if (typeof path === 'string') {
      window.history.replaceState({}, '', path);
    } else {
      const url = path.pathname + (path.search || '') + (path.hash || '');
      window.history.replaceState(path.state || {}, '', url);
    }
  }, []);

  const go = useCallback((delta: number) => {
    window.history.go(delta);
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  return {
    push,
    replace,
    go,
    goBack,
    goForward,
    location: {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: null
    },
    length: window.history.length
  };
}

// Plugin Hook
export function usePlugin(pluginKey: string) {
  const { plugins } = useUmiRuntime();
  const [plugin, setPlugin] = useState(() => plugins.get(pluginKey));

  useEffect(() => {
    setPlugin(plugins.get(pluginKey));
  }, [plugins, pluginKey]);

  const registerPlugin = useCallback((key: string, pluginDef: any) => {
    plugins.set(key, pluginDef);
  }, [plugins]);

  const unregisterPlugin = useCallback((key: string) => {
    plugins.delete(key);
  }, [plugins]);

  return {
    plugin,
    registerPlugin,
    unregisterPlugin,
    hasPlugin: (key: string) => plugins.has(key)
  };
}

// Layout Hook
export function useLayout() {
  const { config } = useUmiRuntime();
  const [layoutSettings, setLayoutSettings] = useState(() => 
    typeof config.layout === 'object' ? config.layout : {}
  );

  const updateLayout = useCallback((newSettings: any) => {
    setLayoutSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    settings: layoutSettings,
    updateLayout,
    isLayoutEnabled: !!config.layout
  };
}

// Theme Hook (for Ant Design)
export function useTheme() {
  const { antd } = useUmiRuntime();
  const [theme, setTheme] = useState(() => antd?.theme || {});

  const updateTheme = useCallback((newTheme: any) => {
    setTheme(prev => ({ ...prev, ...newTheme }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setTheme(prev => ({
      ...prev,
      algorithm: prev.algorithm ? undefined : 'dark'
    }));
  }, []);

  return {
    theme,
    updateTheme,
    toggleDarkMode,
    isDark: theme.algorithm === 'dark'
  };
}

// Utils
export function getLocale(): string {
  return 'en-US';
}

export function setLocale(locale: string): void {
  console.log('Set locale:', locale);
}

export function getAllLocales(): string[] {
  return ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR'];
}

export function request(url: string, options?: RequestConfig): Promise<any> {
  return fetch(url, {
    method: options?.method || 'GET',
    headers: options?.headers,
    body: options?.data ? JSON.stringify(options.data) : undefined,
    ...options
  }).then(res => res.json());
}

// Connect function - Bridges to Katalyst (NOT DVA)
export function connect<T = any, U = any>(
  mapStateToProps?: (state: any) => T,
  mapDispatchToProps?: (dispatch: any) => U
) {
  return <P extends object>(Component: React.ComponentType<P & T & U>) => function ConnectedComponent(props: P) {
      const katalyst = useKatalystContext();
      // Bridge to Katalyst state management instead of DVA
      const mappedState = mapStateToProps ? mapStateToProps(katalyst) : ({} as T);
      const mappedDispatch = mapDispatchToProps ? mapDispatchToProps(katalyst.updateConfig) : ({} as U);
      
      return <Component {...props} ...mappedState...mappedDispatch/>;
    };
}

// UMI-specific utilities
export function useUmiPlugin(name: string) {
  const { plugins } = useUmiRuntime();
  return plugins.get(name);
}

export function useUmiConfig() {
  const { config } = useUmiRuntime();
  return config;
}

export function useUmiRoutes() {
  const { routes } = useUmiRuntime();
  return routes;
}