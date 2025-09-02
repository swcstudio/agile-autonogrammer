import { useEffect, useState } from 'react';
import type { KatalystConfig } from '../types/index.ts';

export function useKatalyst(initialConfig: KatalystConfig) {
  const [config, setConfig] = useState<KatalystConfig>(initialConfig);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeKatalyst = async () => {
      try {
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Katalyst:', error);
      }
    };

    initializeKatalyst();
  }, []);

  const updateConfig = (updates: Partial<KatalystConfig>) => {
    setConfig((prev: KatalystConfig) => ({ ...prev, ...updates }));
  };

  return {
    config,
    updateConfig,
    isInitialized,
  };
}
