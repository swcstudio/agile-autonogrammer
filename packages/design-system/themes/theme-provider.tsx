/**
 * Katalyst Design System - Theme Provider
 *
 * Comprehensive theme management for all meta frameworks
 * Handles light/dark/system themes with SSR support
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useKatalystContext } from '../components/KatalystProvider.tsx';
import {
  type Framework,
  type Theme,
  darkTheme,
  generateThemeCSS,
  lightTheme,
  validateTheme,
} from './tokens.ts';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ThemeContextValue {
  /** Current active theme */
  theme: Theme;
  /** Resolved theme (never 'system') */
  resolvedTheme: 'light' | 'dark';
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Check if system prefers dark mode */
  systemPrefersDark: boolean;
  /** Current framework context */
  framework: Framework;
  /** Theme CSS variables */
  themeVars: Record<string, string>;
  /** Force theme refresh */
  refreshTheme: () => void;
}

export interface ThemeProviderProps {
  /** Default theme */
  defaultTheme?: Theme;
  /** Storage key for theme persistence */
  storageKey?: string;
  /** Disable theme persistence */
  disableTransitions?: boolean;
  /** Custom theme overrides */
  themeOverrides?: Partial<Record<string, string>>;
  /** Framework context */
  framework?: Framework;
  /** Enable debug mode */
  debug?: boolean;
  /** Children components */
  children: ReactNode;
}

// =============================================================================
// THEME CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Get system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme from localStorage
 */
function getStoredTheme(storageKey: string): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    return (localStorage.getItem(storageKey) as Theme) || null;
  } catch {
    return null;
  }
}

/**
 * Store theme in localStorage
 */
function setStoredTheme(storageKey: string, theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Silently fail
  }
}

/**
 * Apply theme variables to document
 */
function applyThemeVariables(
  resolvedTheme: 'light' | 'dark',
  framework: Framework,
  overrides?: Partial<Record<string, string>>
): Record<string, string> {
  const themeTokens = resolvedTheme === 'light' ? lightTheme : darkTheme;
  const finalTheme = { ...themeTokens, ...overrides };

  if (typeof document !== 'undefined') {
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(finalTheme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set theme attributes
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-framework', framework);

    // Add theme class for compatibility
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);

    // Add framework class
    root.classList.remove('katalyst-core', 'katalyst-nextjs', 'katalyst-remix');
    root.classList.add(`katalyst-${framework}`);
  }

  return finalTheme;
}

// =============================================================================
// THEME PROVIDER COMPONENT
// =============================================================================

export function ThemeProvider({
  defaultTheme = 'system',
  storageKey = 'katalyst-theme',
  disableTransitions = false,
  themeOverrides,
  framework: frameworkProp,
  debug = false,
  children,
}: ThemeProviderProps) {
  // Get framework from Katalyst context or use prop
  const katalystContext = useKatalystContext();
  const framework = frameworkProp || katalystContext.config.variant;

  // Theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return getStoredTheme(storageKey) || defaultTheme;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemTheme() === 'dark');

  const [mounted, setMounted] = useState(false);

  // Resolve actual theme (never 'system')
  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  // Get current theme variables
  const [themeVars, setThemeVars] = useState<Record<string, string>>({});

  // =============================================================================
  // THEME MANAGEMENT
  // =============================================================================

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      setStoredTheme(storageKey, newTheme);

      if (debug) {
        console.log(`[Katalyst Theme] Changed to: ${newTheme}`);
      }
    },
    [storageKey, debug]
  );

  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      setTheme(systemPrefersDark ? 'light' : 'dark');
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  }, [theme, systemPrefersDark, setTheme]);

  const refreshTheme = useCallback(() => {
    const vars = applyThemeVariables(resolvedTheme, framework, themeOverrides);
    setThemeVars(vars);
  }, [resolvedTheme, framework, themeOverrides]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Handle system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme variables when theme changes
  useEffect(() => {
    if (!mounted) return;

    // Disable transitions temporarily to avoid flash
    if (disableTransitions && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
        }
      `;
      document.head.appendChild(style);

      // Re-enable after a frame
      requestAnimationFrame(() => {
        document.head.removeChild(style);
      });
    }

    refreshTheme();
  }, [resolvedTheme, framework, themeOverrides, disableTransitions, refreshTheme, mounted]);

  // Mark as mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    refreshTheme(); // Apply initial theme
  }, [refreshTheme]);

  // Validate theme tokens in development
  useEffect(() => {
    if (debug && process.env.NODE_ENV === 'development') {
      const currentTheme = resolvedTheme === 'light' ? lightTheme : darkTheme;
      const isValid = validateTheme(currentTheme);

      if (!isValid) {
        console.warn(`[Katalyst Theme] Invalid theme detected: ${resolvedTheme}`);
      }
    }
  }, [resolvedTheme, debug]);

  // =============================================================================
  // SSR HANDLING
  // =============================================================================

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div
        style={{
          // Apply basic theme variables for SSR
          ...Object.fromEntries(
            Object.entries(lightTheme).map(([key, value]) => [
              key.replace('--katalyst-', '--'),
              value,
            ])
          ),
        }}
      >
        {children}
      </div>
    );
  }

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemPrefersDark,
    framework,
    themeVars,
    refreshTheme,
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <ThemeContext.Provider value={contextValue}>
      <div
        className={`katalyst-design-system ${debug ? 'katalyst-debug' : ''}`}
        data-theme={resolvedTheme}
        data-framework={framework}
        style={{
          colorScheme: resolvedTheme,
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get current theme without context
 */
export function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
}

/**
 * Hook to access specific theme tokens
 */
export function useThemeTokens<T extends keyof ThemeContextValue['themeVars']>(
  tokens: T[]
): Pick<ThemeContextValue['themeVars'], T> {
  const { themeVars } = useTheme();

  return tokens.reduce(
    (acc, token) => {
      acc[token] = themeVars[token];
      return acc;
    },
    {} as Pick<ThemeContextValue['themeVars'], T>
  );
}

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

/**
 * Theme-aware CSS injection component
 */
export function ThemeStyle() {
  const { resolvedTheme } = useTheme();

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: generateThemeCSS(resolvedTheme),
      }}
    />
  );
}

/**
 * Theme toggle button component
 */
export interface ThemeToggleProps {
  className?: string;
  lightIcon?: ReactNode;
  darkIcon?: ReactNode;
  systemIcon?: ReactNode;
}

export function ThemeToggle({
  className = '',
  lightIcon = '☀️',
  darkIcon = '🌙',
  systemIcon = '💻',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'system') return systemIcon;
    return resolvedTheme === 'light' ? lightIcon : darkIcon;
  };

  const getAriaLabel = () => {
    return `Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`;
  };

  return (
    <button
      type="button"
      className={`katalyst-button ${className}`}
      onClick={toggleTheme}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getIcon()}
    </button>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ThemeProvider;
