import { type ReactNode, createContext, useContext } from 'react';
import { useKatalyst } from '../hooks/use-katalyst.ts';
import type { KatalystConfig } from '../types/index.ts';

interface KatalystContextValue {
  config: KatalystConfig;
  updateConfig: (updates: Partial<KatalystConfig>) => void;
  isInitialized: boolean;
}

const KatalystContext = createContext<KatalystContextValue | null>(null);

/**
 * Props for the KatalystProvider component
 * 
 * @example
 * ```tsx
 * <KatalystProvider config={{ framework: 'nextjs', theme: { mode: 'dark' } }}>
 *   <App />
 * </KatalystProvider>
 * ```
 */
interface KatalystProviderProps {
  /** React children to be wrapped with Katalyst context */
  children: ReactNode;
  /** Configuration object for the Katalyst ecosystem */
  config: KatalystConfig;
}

/**
 * KatalystProvider - Root provider for the SWC Studio ecosystem
 * 
 * This component provides the foundational context for all Katalyst components,
 * hooks, and integrations. It manages configuration, theming, and shared state.
 * 
 * @example Basic usage
 * ```tsx
 * import { KatalystProvider } from '@swcstudio/shared';
 * 
 * function App() {
 *   return (
 *     <KatalystProvider config={{ framework: 'nextjs' }}>
 *       <YourApp />
 *     </KatalystProvider>
 *   );
 * }
 * ```
 * 
 * @example With custom theme
 * ```tsx
 * <KatalystProvider 
 *   config={{ 
 *     framework: 'remix',
 *     theme: { 
 *       mode: 'dark',
 *       primaryColor: '#6366f1' 
 *     }
 *   }}
 * >
 *   <App />
 * </KatalystProvider>
 * ```
 */
export function KatalystProvider({ children, config }: KatalystProviderProps) {
  const katalyst = useKatalyst(config);

  return <KatalystContext.Provider value={katalyst}>{children}</KatalystContext.Provider>;
}

export function useKatalystContext() {
  const context = useContext(KatalystContext);
  if (!context) {
    throw new Error('useKatalystContext must be used within a KatalystProvider');
  }
  return context;
}
