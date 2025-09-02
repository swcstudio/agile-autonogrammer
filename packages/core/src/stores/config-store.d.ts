interface ConfigStore {
  theme: 'light' | 'dark' | 'system';
  variant: 'core' | 'remix' | 'nextjs';
  devMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setVariant: (variant: 'core' | 'remix' | 'nextjs') => void;
  toggleDevMode: () => void;
}
export declare const useConfigStore: import('zustand').UseBoundStore<
  Omit<import('zustand').StoreApi<ConfigStore>, 'persist'> & {
    persist: {
      setOptions: (
        options: Partial<import('zustand/middleware').PersistOptions<ConfigStore, ConfigStore>>
      ) => void;
      clearStorage: () => void;
      rehydrate: () => Promise<void> | void;
      hasHydrated: () => boolean;
      onHydrate: (fn: (state: ConfigStore) => void) => () => void;
      onFinishHydration: (fn: (state: ConfigStore) => void) => () => void;
      getOptions: () => Partial<
        import('zustand/middleware').PersistOptions<ConfigStore, ConfigStore>
      >;
    };
  }
>;
