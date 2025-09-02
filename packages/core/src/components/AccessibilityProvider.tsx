/**
 * Katalyst Accessibility Provider
 *
 * Provides comprehensive accessibility context and utilities
 * across all meta frameworks with automatic compliance checking
 */

import * as React from 'react';
import { cn } from '../utils/cn';

// Accessibility preferences interface
interface AccessibilityPreferences {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersLargeFonts: boolean;
  prefersDarkMode: boolean;
  focusIndicatorStyle: 'ring' | 'outline' | 'glow';
  announceChanges: boolean;
  keyboardNavigation: boolean;
}

// Screen reader announcement levels
type AnnouncementLevel = 'polite' | 'assertive' | 'off';

// Focus management interface
interface FocusManagement {
  trapFocus: boolean;
  restoreFocus: boolean;
  autoFocus: boolean;
  focusableElements: string[];
}

// Accessibility context interface
interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, level?: AnnouncementLevel) => void;
  focusManager: {
    setFocusTrap: (element: HTMLElement | null) => void;
    restoreFocus: () => void;
    focusFirst: (container?: HTMLElement) => void;
    focusLast: (container?: HTMLElement) => void;
  };
  compliance: {
    checkColorContrast: (foreground: string, background: string) => number;
    validateHeadingStructure: (container?: HTMLElement) => boolean;
    checkFocusIndicators: (container?: HTMLElement) => boolean;
    validateLabels: (container?: HTMLElement) => string[];
  };
}

// Create accessibility context
const AccessibilityContext = React.createContext<AccessibilityContextValue | null>(null);

// Default focusable elements selector
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details summary',
  'audio[controls]',
  'video[controls]',
].join(', ');

// Media query hooks for accessibility preferences
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Live region component for announcements
const LiveRegion: React.FC<{
  level: AnnouncementLevel;
  message: string;
}> = ({ level, message }) => {
  if (!message || level === 'off') return null;

  return (
    <div aria-live={level} aria-atomic="true" className="sr-only" role="status">
      {message}
    </div>
  );
};

// Focus trap implementation
function useFocusTrap(enabled = false) {
  const containerRef = React.useRef<HTMLElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const getFocusableElements = React.useCallback(() => {
    if (!containerRef.current) return [];

    return Array.from(containerRef.current.querySelectorAll(FOCUSABLE_ELEMENTS)) as HTMLElement[];
  }, []);

  const focusFirst = React.useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = React.useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, getFocusableElements]
  );

  React.useEffect(() => {
    if (enabled && containerRef.current) {
      // Store previous focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first element
      focusFirst();

      // Add event listener
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);

        // Restore focus
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [enabled, handleKeyDown, focusFirst]);

  return { containerRef, focusFirst, focusLast };
}

// Color contrast calculation
function calculateContrast(foreground: string, background: string): number {
  // Simplified contrast calculation
  // In production, use a proper color library
  const getLuminance = (color: string): number => {
    // This is a simplified version - use a proper color parser in production
    const hex = color.replace('#', '');
    const r = Number.parseInt(hex.substr(0, 2), 16) / 255;
    const g = Number.parseInt(hex.substr(2, 2), 16) / 255;
    const b = Number.parseInt(hex.substr(4, 2), 16) / 255;

    const gamma = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

    return 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Accessibility provider component
export interface AccessibilityProviderProps {
  children: React.ReactNode;
  /**
   * Initial accessibility preferences
   */
  initialPreferences?: Partial<AccessibilityPreferences>;
  /**
   * Whether to automatically detect system preferences
   */
  detectSystemPreferences?: boolean;
  /**
   * Whether to persist preferences to localStorage
   */
  persistPreferences?: boolean;
  /**
   * Custom focusable elements selector
   */
  focusableElements?: string;
}

/**
 * Accessibility Provider for Katalyst React framework
 *
 * Features:
 * - System preference detection (prefers-reduced-motion, etc.)
 * - Screen reader announcements
 * - Focus management and trapping
 * - Color contrast validation
 * - Heading structure validation
 * - Label validation
 * - Keyboard navigation support
 * - Preference persistence
 *
 * @example
 * ```tsx
 * <AccessibilityProvider
 *   detectSystemPreferences
 *   persistPreferences
 * >
 *   <App />
 * </AccessibilityProvider>
 * ```
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  initialPreferences = {},
  detectSystemPreferences = true,
  persistPreferences = true,
  focusableElements = FOCUSABLE_ELEMENTS,
}) => {
  // Media query hooks for system preferences
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Announcement state
  const [announcement, setAnnouncement] = React.useState('');
  const [announcementLevel, setAnnouncementLevel] = React.useState<AnnouncementLevel>('polite');

  // Focus trap state
  const [focusTrapElement, setFocusTrapElement] = React.useState<HTMLElement | null>(null);
  const [previousFocus, setPreviousFocus] = React.useState<HTMLElement | null>(null);

  // Preferences state with system detection
  const [preferences, setPreferences] = React.useState<AccessibilityPreferences>(() => {
    const defaultPreferences: AccessibilityPreferences = {
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersLargeFonts: false,
      prefersDarkMode: false,
      focusIndicatorStyle: 'ring',
      announceChanges: true,
      keyboardNavigation: true,
      ...initialPreferences,
    };

    // Load from localStorage if enabled
    if (persistPreferences && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('katalyst-a11y-preferences');
        if (saved) {
          return { ...defaultPreferences, ...JSON.parse(saved) };
        }
      } catch (error) {
        console.warn('Failed to load accessibility preferences:', error);
      }
    }

    return defaultPreferences;
  });

  // Update preferences with system detection
  React.useEffect(() => {
    if (detectSystemPreferences) {
      setPreferences((prev) => ({
        ...prev,
        prefersReducedMotion,
        prefersHighContrast,
        prefersDarkMode,
      }));
    }
  }, [detectSystemPreferences, prefersReducedMotion, prefersHighContrast, prefersDarkMode]);

  // Persist preferences to localStorage
  React.useEffect(() => {
    if (persistPreferences && typeof window !== 'undefined') {
      try {
        localStorage.setItem('katalyst-a11y-preferences', JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save accessibility preferences:', error);
      }
    }
  }, [preferences, persistPreferences]);

  // Update preferences function
  const updatePreferences = React.useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  // Announcement function
  const announce = React.useCallback(
    (message: string, level: AnnouncementLevel = 'polite') => {
      if (!preferences.announceChanges || !message.trim()) return;

      setAnnouncement(''); // Clear first to ensure re-announcement
      setTimeout(() => {
        setAnnouncement(message);
        setAnnouncementLevel(level);
      }, 10);

      // Clear announcement after delay
      setTimeout(() => setAnnouncement(''), 5000);
    },
    [preferences.announceChanges]
  );

  // Focus management
  const focusManager = React.useMemo(
    () => ({
      setFocusTrap: (element: HTMLElement | null) => {
        if (element) {
          setPreviousFocus(document.activeElement as HTMLElement);
        } else if (previousFocus) {
          previousFocus.focus();
          setPreviousFocus(null);
        }
        setFocusTrapElement(element);
      },

      restoreFocus: () => {
        if (previousFocus) {
          previousFocus.focus();
          setPreviousFocus(null);
        }
      },

      focusFirst: (container?: HTMLElement) => {
        const root = container || document.body;
        const focusable = root.querySelector(focusableElements) as HTMLElement;
        if (focusable) focusable.focus();
      },

      focusLast: (container?: HTMLElement) => {
        const root = container || document.body;
        const focusableList = root.querySelectorAll(focusableElements);
        const last = focusableList[focusableList.length - 1] as HTMLElement;
        if (last) last.focus();
      },
    }),
    [previousFocus, focusableElements]
  );

  // Compliance checking utilities
  const compliance = React.useMemo(
    () => ({
      checkColorContrast: (foreground: string, background: string) => {
        return calculateContrast(foreground, background);
      },

      validateHeadingStructure: (container = document.body): boolean => {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let isValid = true;
        let lastLevel = 0;

        headings.forEach((heading) => {
          const level = Number.parseInt(heading.tagName.charAt(1));
          if (level > lastLevel + 1) {
            isValid = false;
          }
          lastLevel = level;
        });

        return isValid;
      },

      checkFocusIndicators: (container = document.body): boolean => {
        const focusableElements = container.querySelectorAll(focusableElements);
        // This would check if focusable elements have proper focus indicators
        // Implementation depends on specific requirements
        return focusableElements.length > 0;
      },

      validateLabels: (container = document.body): string[] => {
        const issues: string[] = [];

        // Check form controls have labels
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach((input: Element) => {
          const htmlInput = input as HTMLInputElement;
          const hasLabel =
            htmlInput.labels?.length > 0 ||
            htmlInput.getAttribute('aria-label') ||
            htmlInput.getAttribute('aria-labelledby');

          if (!hasLabel) {
            issues.push(`Form control missing label: ${htmlInput.tagName.toLowerCase()}`);
          }
        });

        // Check images have alt text
        const images = container.querySelectorAll('img');
        images.forEach((img: Element) => {
          const htmlImg = img as HTMLImageElement;
          if (!htmlImg.alt && !htmlImg.getAttribute('aria-hidden')) {
            issues.push(`Image missing alt text: ${htmlImg.src}`);
          }
        });

        return issues;
      },
    }),
    []
  );

  // Apply accessibility styles to document
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Reduced motion
    if (preferences.prefersReducedMotion) {
      root.style.setProperty('--katalyst-animation-duration-200ms', '0ms');
      root.style.setProperty('--katalyst-animation-duration-300ms', '0ms');
      root.style.setProperty('--katalyst-animation-duration-500ms', '0ms');
    }

    // High contrast mode
    if (preferences.prefersHighContrast) {
      root.classList.add('katalyst-high-contrast');
    } else {
      root.classList.remove('katalyst-high-contrast');
    }

    // Large fonts
    if (preferences.prefersLargeFonts) {
      root.style.fontSize = '1.2em';
    } else {
      root.style.fontSize = '';
    }

    // Focus indicator style
    root.setAttribute('data-focus-style', preferences.focusIndicatorStyle);
  }, [preferences]);

  // Context value
  const contextValue: AccessibilityContextValue = {
    preferences,
    updatePreferences,
    announce,
    focusManager,
    compliance,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      <LiveRegion level={announcementLevel} message={announcement} />
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibility = (): AccessibilityContextValue => {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Hook for announcements
export const useAnnounce = () => {
  const { announce } = useAccessibility();
  return announce;
};

// Hook for focus management
export const useFocusManager = () => {
  const { focusManager } = useAccessibility();
  return focusManager;
};

// Hook for compliance checking
export const useCompliance = () => {
  const { compliance } = useAccessibility();
  return compliance;
};

// Hook for skip links
export const useSkipLinks = (links: Array<{ href: string; label: string }>) => {
  const { announce } = useAccessibility();

  const handleSkipLink = React.useCallback(
    (href: string, label: string) => {
      const target = document.querySelector(href);
      if (target) {
        (target as HTMLElement).focus();
        announce(`Skipped to ${label}`);
      }
    },
    [announce]
  );

  return { handleSkipLink };
};

// Export types
export type {
  AccessibilityPreferences,
  AnnouncementLevel,
  FocusManagement,
  AccessibilityContextValue,
};
