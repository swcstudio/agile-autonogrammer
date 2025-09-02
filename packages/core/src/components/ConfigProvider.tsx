import { type ReactNode, createContext, useContext } from 'react';
import { useConfigStore } from '../stores/config-store.ts';

interface ConfigContextValue {
  theme: 'light' | 'dark' | 'system';
  variant: 'core' | 'remix' | 'nextjs';
  devMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setVariant: (variant: 'core' | 'remix' | 'nextjs') => void;
  toggleDevMode: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const store = useConfigStore();

  return <ConfigContext.Provider value={store}>{children}</ConfigContext.Provider>;
}

export function useConfigContext() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfigContext must be used within a ConfigProvider');
  }
  return context;
}
