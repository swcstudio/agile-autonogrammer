import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigStore {
  theme: 'light' | 'dark' | 'system';
  variant: 'core' | 'remix' | 'nextjs';
  devMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setVariant: (variant: 'core' | 'remix' | 'nextjs') => void;
  toggleDevMode: () => void;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, _get) => ({
      theme: 'system' as const,
      variant: 'core' as const,
      devMode: false,
      setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),
      setVariant: (variant: 'core' | 'remix' | 'nextjs') => set({ variant }),
      toggleDevMode: () => set((state) => ({ devMode: !state.devMode })),
    }),
    {
      name: 'katalyst-config',
    }
  )
);
