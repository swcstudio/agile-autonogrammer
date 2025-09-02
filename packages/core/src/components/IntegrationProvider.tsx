import { type ReactNode, createContext, useContext, useEffect } from 'react';
import { useIntegrationStore } from '../stores/integration-store.ts';
import type { KatalystIntegration } from '../types/index.ts';

interface IntegrationContextValue {
  integrations: Map<string, KatalystIntegration>;
  loadedIntegrations: Set<string>;
  addIntegration: (integration: KatalystIntegration) => void;
  removeIntegration: (name: string) => void;
  toggleIntegration: (name: string) => void;
}

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

interface IntegrationProviderProps {
  children: ReactNode;
  initialIntegrations?: KatalystIntegration[];
}

export function IntegrationProvider({
  children,
  initialIntegrations = [],
}: IntegrationProviderProps) {
  const store = useIntegrationStore();

  useEffect(() => {
    initialIntegrations.forEach((integration) => {
      store.addIntegration(integration);
    });
  }, [initialIntegrations, store]);

  return <IntegrationContext.Provider value={store}>{children}</IntegrationContext.Provider>;
}

export function useIntegrationContext() {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrationContext must be used within an IntegrationProvider');
  }
  return context;
}
