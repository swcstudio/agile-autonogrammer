import { create } from 'zustand';
import type { KatalystIntegration } from '../types/index.ts';

interface IntegrationStore {
  integrations: Map<string, KatalystIntegration>;
  loadedIntegrations: Set<string>;
  addIntegration: (integration: KatalystIntegration) => void;
  removeIntegration: (name: string) => void;
  toggleIntegration: (name: string) => void;
  markAsLoaded: (name: string) => void;
}

export const useIntegrationStore = create<IntegrationStore>((set, _get) => ({
  integrations: new Map(),
  loadedIntegrations: new Set(),
  addIntegration: (integration: KatalystIntegration) =>
    set((state: IntegrationStore) => {
      const newIntegrations = new Map(state.integrations);
      newIntegrations.set(integration.name, integration);
      return { integrations: newIntegrations };
    }),
  removeIntegration: (name: string) =>
    set((state: IntegrationStore) => {
      const newIntegrations = new Map(state.integrations);
      newIntegrations.delete(name);
      return { integrations: newIntegrations };
    }),
  toggleIntegration: (name: string) =>
    set((state: IntegrationStore) => {
      const integration = state.integrations.get(name);
      if (integration) {
        const newIntegrations = new Map(state.integrations);
        newIntegrations.set(name, { ...integration, enabled: !integration.enabled });
        return { integrations: newIntegrations };
      }
      return state;
    }),
  markAsLoaded: (name: string) =>
    set((state: IntegrationStore) => ({
      loadedIntegrations: new Set([...state.loadedIntegrations, name]),
    })),
}));
