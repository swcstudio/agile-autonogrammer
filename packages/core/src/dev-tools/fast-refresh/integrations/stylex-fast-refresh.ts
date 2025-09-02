/**
 * StyleX Fast Refresh Integration
 *
 * Provides intelligent Fast Refresh for StyleX themes and components:
 * - Hot theme switching without component re-mounting
 * - Design token updates in real-time
 * - Component style refresh with state preservation
 */

import type { FastRefreshIntegration, RefreshUpdate } from '../KatalystFastRefreshProvider';

export interface StyleXFastRefreshConfig {
  hotThemes?: boolean;
  preserveThemeState?: boolean;
  refreshTokens?: boolean;
  debugMode?: boolean;
}

export class StyleXFastRefresh implements FastRefreshIntegration {
  name = 'stylex';
  private config: StyleXFastRefreshConfig;
  private currentTheme: string | null = null;
  private styleSheets: Map<string, CSSStyleSheet> = new Map();
  private themeObservers: Set<(theme: string) => void> = new Set();

  constructor(config: StyleXFastRefreshConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Detect StyleX runtime
    if (typeof window !== 'undefined') {
      // Look for StyleX runtime
      const stylexRuntime = (window as any).__STYLEX__;

      if (stylexRuntime) {
        console.log('🎨 StyleX Fast Refresh initialized');

        // Hook into StyleX theme changes
        this.setupThemeChangeDetection();

        // Initialize style sheet tracking
        this.initializeStyleSheetTracking();
      } else {
        if (this.config.debugMode) {
          console.warn('⚠️  StyleX runtime not detected');
        }
      }
    }
  }

  async refresh(moduleId: string, exports: any): Promise<void> {
    const isThemeModule = this.isThemeModule(exports);
    const isTokenModule = this.isTokenModule(exports);
    const isStylexComponent = this.isStylexComponent(exports);

    if (isThemeModule && this.config.hotThemes) {
      await this.refreshTheme(moduleId, exports);
    }

    if (isTokenModule && this.config.refreshTokens) {
      await this.refreshTokens(moduleId, exports);
    }

    if (isStylexComponent) {
      await this.refreshStylexComponent(moduleId, exports);
    }
  }

  async cleanup(): Promise<void> {
    this.themeObservers.clear();
    this.styleSheets.clear();
  }

  // Theme Management
  private isThemeModule(exports: any): boolean {
    return Object.keys(exports).some(
      (key) =>
        key.includes('Theme') ||
        key.includes('theme') ||
        (exports[key] && typeof exports[key] === 'object' && exports[key].__theme__)
    );
  }

  private async refreshTheme(moduleId: string, exports: any): Promise<void> {
    const themeExports = Object.entries(exports).filter(
      ([key, value]) =>
        key.includes('Theme') ||
        key.includes('theme') ||
        (value && typeof value === 'object' && (value as any).__theme__)
    );

    for (const [themeName, themeDefinition] of themeExports) {
      await this.applyThemeRefresh(themeName, themeDefinition);
    }

    if (this.config.debugMode) {
      console.log(`🎨 Refreshed ${themeExports.length} themes from ${moduleId}`);
    }
  }

  private async applyThemeRefresh(themeName: string, themeDefinition: any): Promise<void> {
    if (typeof window === 'undefined') return;

    // Generate CSS for the new theme
    const cssText = this.generateThemeCSS(themeName, themeDefinition);

    // Update existing stylesheet or create new one
    let styleSheet = this.styleSheets.get(themeName);

    if (!styleSheet) {
      // Create new stylesheet
      const style = document.createElement('style');
      style.setAttribute('data-theme', themeName);
      style.setAttribute('data-stylex-hot-refresh', 'true');
      document.head.appendChild(style);
      styleSheet = style.sheet!;
      this.styleSheets.set(themeName, styleSheet);
    }

    // Clear existing rules
    while (styleSheet.cssRules.length > 0) {
      styleSheet.deleteRule(0);
    }

    // Add new rules
    const rules = cssText.split('}').filter((rule) => rule.trim());
    rules.forEach((rule) => {
      if (rule.trim()) {
        try {
          styleSheet!.insertRule(rule + '}', styleSheet!.cssRules.length);
        } catch (error) {
          if (this.config.debugMode) {
            console.warn('Failed to insert CSS rule:', rule, error);
          }
        }
      }
    });

    // Notify theme observers
    this.notifyThemeChange(themeName);

    // Trigger component re-render if preserving state
    if (this.config.preserveThemeState) {
      this.triggerComponentRerender();
    }
  }

  private generateThemeCSS(themeName: string, themeDefinition: any): string {
    if (!themeDefinition || typeof themeDefinition !== 'object') {
      return '';
    }

    const cssRules: string[] = [];

    // Generate CSS custom properties for theme
    const themeVars: string[] = [];

    Object.entries(themeDefinition).forEach(([key, value]) => {
      if (typeof value === 'string') {
        themeVars.push(`--${key}: ${value}`);
      }
    });

    if (themeVars.length > 0) {
      cssRules.push(`:root[data-theme="${themeName}"] { ${themeVars.join('; ')} }`);
    }

    // Generate atomic CSS classes
    const atomicClasses = this.generateAtomicClasses(themeDefinition);
    cssRules.push(...atomicClasses);

    return cssRules.join('\n');
  }

  private generateAtomicClasses(themeDefinition: any): string[] {
    const classes: string[] = [];

    // This is a simplified version - real implementation would be more complex
    Object.entries(themeDefinition).forEach(([property, value]) => {
      if (typeof value === 'string') {
        const className = this.generateAtomicClassName(property, value);
        classes.push(`.${className} { ${this.convertPropertyToCSS(property)}: ${value} }`);
      }
    });

    return classes;
  }

  private generateAtomicClassName(property: string, value: string): string {
    // Generate unique class name based on property and value
    const hash = this.hashString(`${property}-${value}`);
    return `sx${hash.substring(0, 8)}`;
  }

  private convertPropertyToCSS(property: string): string {
    // Convert camelCase to kebab-case
    return property.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  // Token Management
  private isTokenModule(exports: any): boolean {
    return Object.keys(exports).some(
      (key) =>
        key.includes('tokens') ||
        key.includes('Token') ||
        (exports[key] && typeof exports[key] === 'object' && exports[key].__tokens__)
    );
  }

  private async refreshTokens(moduleId: string, exports: any): Promise<void> {
    const tokenExports = Object.entries(exports).filter(
      ([key, value]) =>
        key.includes('tokens') ||
        key.includes('Token') ||
        (value && typeof value === 'object' && (value as any).__tokens__)
    );

    for (const [tokenName, tokenDefinition] of tokenExports) {
      await this.applyTokenRefresh(tokenName, tokenDefinition);
    }

    if (this.config.debugMode) {
      console.log(`🎯 Refreshed ${tokenExports.length} token sets from ${moduleId}`);
    }
  }

  private async applyTokenRefresh(tokenName: string, tokenDefinition: any): Promise<void> {
    if (typeof window === 'undefined') return;

    // Update CSS custom properties for tokens
    const style =
      (document.querySelector(`style[data-tokens="${tokenName}"]`) as HTMLStyleElement) ||
      document.createElement('style');

    if (!style.parentNode) {
      style.setAttribute('data-tokens', tokenName);
      style.setAttribute('data-stylex-hot-refresh', 'true');
      document.head.appendChild(style);
    }

    // Generate CSS for tokens
    const cssText = this.generateTokenCSS(tokenDefinition);
    style.textContent = cssText;

    // Trigger re-render of components using these tokens
    this.triggerComponentRerender();
  }

  private generateTokenCSS(tokenDefinition: any): string {
    const cssVars: string[] = [];

    if (tokenDefinition && typeof tokenDefinition === 'object') {
      Object.entries(tokenDefinition).forEach(([key, value]) => {
        if (typeof value === 'string') {
          cssVars.push(`--${key}: ${value}`);
        }
      });
    }

    return `:root { ${cssVars.join('; ')} }`;
  }

  // Component Management
  private isStylexComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('stylex.props') ||
          value.toString().includes('stylex.create') ||
          value.toString().includes('stylex.keyframes'))
    );
  }

  private async refreshStylexComponent(moduleId: string, exports: any): Promise<void> {
    // For StyleX components, we mainly need to ensure the component re-renders
    // with the new styles, which is handled by React's Fast Refresh

    if (this.config.debugMode) {
      console.log(`🔄 StyleX component refresh for ${moduleId}`);
    }

    // Trigger any necessary style recalculations
    this.triggerStyleRecalculation();
  }

  // Utility Methods
  private setupThemeChangeDetection(): void {
    if (typeof window === 'undefined') return;

    // Watch for theme changes in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = (mutation.target as Element).getAttribute('data-theme');
          if (newTheme && newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.notifyThemeChange(newTheme);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  private initializeStyleSheetTracking(): void {
    if (typeof window === 'undefined') return;

    // Track existing StyleX stylesheets
    const existingStyles = document.querySelectorAll('style[data-stylex]');
    existingStyles.forEach((style) => {
      const sheet = (style as HTMLStyleElement).sheet;
      if (sheet) {
        const identifier = style.getAttribute('data-stylex') || 'default';
        this.styleSheets.set(identifier, sheet);
      }
    });
  }

  private notifyThemeChange(themeName: string): void {
    this.themeObservers.forEach((observer) => {
      try {
        observer(themeName);
      } catch (error) {
        console.warn('Theme observer error:', error);
      }
    });
  }

  private triggerComponentRerender(): void {
    if (typeof window !== 'undefined') {
      // Dispatch custom event to trigger component re-renders
      window.dispatchEvent(
        new CustomEvent('stylex:theme-change', {
          detail: { timestamp: Date.now() },
        })
      );
    }
  }

  private triggerStyleRecalculation(): void {
    if (typeof window !== 'undefined') {
      // Force style recalculation by accessing computed styles
      document.documentElement.offsetHeight;
    }
  }

  // Public API for theme management
  subscribeToThemeChanges(callback: (theme: string) => void): () => void {
    this.themeObservers.add(callback);
    return () => this.themeObservers.delete(callback);
  }

  async broadcastUpdate(update: RefreshUpdate): Promise<void> {
    if (update.type === 'theme-change') {
      // Notify other StyleX instances about theme changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('stylex:fast-refresh', {
            detail: update,
          })
        );
      }
    }
  }
}

// Helper hooks for StyleX Fast Refresh
export function useStyleXThemePreservation() {
  return {
    preserve: (theme: string) => {
      if (typeof window !== 'undefined') {
        (window as any).__stylex_preserved_theme__ = theme;
        document.documentElement.setAttribute('data-theme', theme);
      }
    },
    restore: () => {
      if (typeof window !== 'undefined') {
        return (
          (window as any).__stylex_preserved_theme__ ||
          document.documentElement.getAttribute('data-theme')
        );
      }
      return null;
    },
  };
}

export function useStyleXTokenPreservation() {
  return {
    preserve: (tokens: Record<string, any>) => {
      if (typeof window !== 'undefined') {
        (window as any).__stylex_preserved_tokens__ = tokens;
      }
    },
    restore: () => {
      if (typeof window !== 'undefined') {
        return (window as any).__stylex_preserved_tokens__;
      }
      return null;
    },
  };
}
