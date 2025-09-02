import { create } from 'zustand';
import type { KatalystConfig } from '../types/index.ts';

interface KatalystStore {
  config: KatalystConfig | null;
  isInitialized: boolean;
  setConfig: (config: KatalystConfig) => void;
  updateConfig: (updates: Partial<KatalystConfig>) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useKatalystStore = create<KatalystStore>((set, _get) => ({
  config: null,
  isInitialized: false,
  setConfig: (config: KatalystConfig) => set({ config }),
  updateConfig: (updates: Partial<KatalystConfig>) =>
    set((state: KatalystStore) => ({
      config: state.config ? { ...state.config, ...updates } : null,
    })),
  setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
}));
