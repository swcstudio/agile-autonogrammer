/**
 * Katalyst Design System - Comprehensive Token System
 *
 * Unified design tokens for all meta frameworks (Core, Next.js, Remix)
 * Supports theming, semantic tokens, and cross-platform consistency
 */

// =============================================================================
// PRIMITIVE TOKENS (Base Design Values)
// =============================================================================

export const primitiveTokens = {
  colors: {
    // Neutral Palette (HSL values for better theming)
    neutral: {
      0: '0 0% 100%', // Pure white
      50: '210 20% 98%', // Near white
      100: '210 10% 95%', // Light gray
      200: '214 13% 91%', // Light gray
      300: '213 12% 84%', // Medium light gray
      400: '215 14% 71%', // Medium gray
      500: '215 16% 57%', // Medium gray
      600: '215 19% 35%', // Medium dark gray
      700: '215 25% 27%', // Dark gray
      800: '217 33% 17%', // Very dark gray
      900: '222 84% 5%', // Near black
      950: '0 0% 0%', // Pure black
    },

    // Brand Colors
    brand: {
      emerald: {
        50: '151 81% 96%',
        100: '149 80% 90%',
        200: '152 76% 80%',
        300: '156 72% 67%',
        400: '158 64% 52%',
        500: '160 84% 39%', // Primary brand
        600: '161 94% 30%',
        700: '163 94% 24%',
        800: '163 88% 20%',
        900: '164 86% 16%',
        950: '166 91% 9%',
      },
      blue: {
        50: '214 100% 97%',
        100: '214 95% 93%',
        200: '213 97% 87%',
        300: '212 96% 78%',
        400: '213 94% 68%',
        500: '217 91% 60%',
        600: '221 83% 53%',
        700: '224 76% 48%',
        800: '226 71% 40%',
        900: '224 64% 33%',
        950: '226 55% 21%',
      },
      purple: {
        50: '270 100% 98%',
        100: '269 100% 95%',
        200: '269 100% 92%',
        300: '269 97% 85%',
        400: '270 95% 75%',
        500: '270 91% 65%',
        600: '271 81% 56%',
        700: '272 72% 47%',
        800: '272 67% 39%',
        900: '273 66% 32%',
        950: '274 87% 21%',
      },
    },

    // Semantic Colors
    semantic: {
      success: '142 76% 36%',
      warning: '38 92% 50%',
      error: '0 84% 60%',
      info: '199 89% 48%',
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Mona Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      display: ['Mona Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: { size: '0.75rem', lineHeight: '1rem' },
      sm: { size: '0.875rem', lineHeight: '1.25rem' },
      base: { size: '1rem', lineHeight: '1.5rem' },
      lg: { size: '1.125rem', lineHeight: '1.75rem' },
      xl: { size: '1.25rem', lineHeight: '1.75rem' },
      '2xl': { size: '1.5rem', lineHeight: '2rem' },
      '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
      '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
      '5xl': { size: '3rem', lineHeight: '1' },
      '6xl': { size: '3.75rem', lineHeight: '1' },
      '7xl': { size: '4.5rem', lineHeight: '1' },
      '8xl': { size: '6rem', lineHeight: '1' },
      '9xl': { size: '8rem', lineHeight: '1' },
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Spacing Scale (rem-based for scalability)
  spacing: {
    0: '0rem',
    px: '0.0625rem',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  // Border Radius
  borderRadius: {
    none: '0rem',
    sm: '0.125rem',
    default: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    '4xl': '2rem',
    full: '50rem',
  },

  // Shadows
  boxShadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: '0 0 #0000',
  },

  // Z-Index Scale
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
    toast: '1070',
  },

  // Animation & Timing
  animation: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'in-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
} as const;

// =============================================================================
// SEMANTIC TOKENS (Contextual Design Values)
// =============================================================================

export const semanticTokens = {
  color: {
    // Background Colors
    background: {
      primary: 'var(--katalyst-color-background)',
      secondary: 'var(--katalyst-color-background-secondary)',
      tertiary: 'var(--katalyst-color-background-tertiary)',
      inverse: 'var(--katalyst-color-background-inverse)',
      overlay: 'var(--katalyst-color-background-overlay)',
    },

    // Text Colors
    text: {
      primary: 'var(--katalyst-color-text-primary)',
      secondary: 'var(--katalyst-color-text-secondary)',
      tertiary: 'var(--katalyst-color-text-tertiary)',
      inverse: 'var(--katalyst-color-text-inverse)',
      disabled: 'var(--katalyst-color-text-disabled)',
      link: 'var(--katalyst-color-text-link)',
      'link-hover': 'var(--katalyst-color-text-link-hover)',
    },

    // Border Colors
    border: {
      default: 'var(--katalyst-color-border)',
      secondary: 'var(--katalyst-color-border-secondary)',
      focus: 'var(--katalyst-color-border-focus)',
      error: 'var(--katalyst-color-border-error)',
      success: 'var(--katalyst-color-border-success)',
      warning: 'var(--katalyst-color-border-warning)',
    },

    // Interactive Colors
    interactive: {
      primary: {
        default: 'var(--katalyst-color-interactive-primary)',
        hover: 'var(--katalyst-color-interactive-primary-hover)',
        active: 'var(--katalyst-color-interactive-primary-active)',
        disabled: 'var(--katalyst-color-interactive-primary-disabled)',
      },
      secondary: {
        default: 'var(--katalyst-color-interactive-secondary)',
        hover: 'var(--katalyst-color-interactive-secondary-hover)',
        active: 'var(--katalyst-color-interactive-secondary-active)',
        disabled: 'var(--katalyst-color-interactive-secondary-disabled)',
      },
      destructive: {
        default: 'var(--katalyst-color-interactive-destructive)',
        hover: 'var(--katalyst-color-interactive-destructive-hover)',
        active: 'var(--katalyst-color-interactive-destructive-active)',
        disabled: 'var(--katalyst-color-interactive-destructive-disabled)',
      },
    },

    // Status Colors
    status: {
      success: 'var(--katalyst-color-status-success)',
      warning: 'var(--katalyst-color-status-warning)',
      error: 'var(--katalyst-color-status-error)',
      info: 'var(--katalyst-color-status-info)',
    },
  },

  // Component-specific tokens
  component: {
    button: {
      borderRadius: 'var(--katalyst-component-button-border-radius)',
      fontSize: 'var(--katalyst-component-button-font-size)',
      fontWeight: 'var(--katalyst-component-button-font-weight)',
      lineHeight: 'var(--katalyst-component-button-line-height)',
      paddingX: 'var(--katalyst-component-button-padding-x)',
      paddingY: 'var(--katalyst-component-button-padding-y)',
      minHeight: 'var(--katalyst-component-button-min-height)',
    },
    card: {
      borderRadius: 'var(--katalyst-component-card-border-radius)',
      padding: 'var(--katalyst-component-card-padding)',
      shadow: 'var(--katalyst-component-card-shadow)',
      background: 'var(--katalyst-component-card-background)',
      border: 'var(--katalyst-component-card-border)',
    },
    input: {
      borderRadius: 'var(--katalyst-component-input-border-radius)',
      fontSize: 'var(--katalyst-component-input-font-size)',
      lineHeight: 'var(--katalyst-component-input-line-height)',
      paddingX: 'var(--katalyst-component-input-padding-x)',
      paddingY: 'var(--katalyst-component-input-padding-y)',
      minHeight: 'var(--katalyst-component-input-min-height)',
    },
  },

  // Layout tokens
  layout: {
    container: {
      maxWidth: 'var(--katalyst-layout-container-max-width)',
      padding: 'var(--katalyst-layout-container-padding)',
    },
    section: {
      spacing: 'var(--katalyst-layout-section-spacing)',
      paddingY: 'var(--katalyst-layout-section-padding-y)',
    },
    grid: {
      gap: 'var(--katalyst-layout-grid-gap)',
      columns: 'var(--katalyst-layout-grid-columns)',
    },
  },
} as const;

// =============================================================================
// THEME CONFIGURATIONS
// =============================================================================

export const lightTheme = {
  // Background colors
  '--katalyst-color-background': `hsl(${primitiveTokens.colors.neutral[0]})`,
  '--katalyst-color-background-secondary': `hsl(${primitiveTokens.colors.neutral[50]})`,
  '--katalyst-color-background-tertiary': `hsl(${primitiveTokens.colors.neutral[100]})`,
  '--katalyst-color-background-inverse': `hsl(${primitiveTokens.colors.neutral[900]})`,
  '--katalyst-color-background-overlay': `hsl(${primitiveTokens.colors.neutral[900]} / 0.5)`,

  // Text colors
  '--katalyst-color-text-primary': `hsl(${primitiveTokens.colors.neutral[900]})`,
  '--katalyst-color-text-secondary': `hsl(${primitiveTokens.colors.neutral[600]})`,
  '--katalyst-color-text-tertiary': `hsl(${primitiveTokens.colors.neutral[400]})`,
  '--katalyst-color-text-inverse': `hsl(${primitiveTokens.colors.neutral[0]})`,
  '--katalyst-color-text-disabled': `hsl(${primitiveTokens.colors.neutral[300]})`,
  '--katalyst-color-text-link': `hsl(${primitiveTokens.colors.brand.emerald[600]})`,
  '--katalyst-color-text-link-hover': `hsl(${primitiveTokens.colors.brand.emerald[700]})`,

  // Border colors
  '--katalyst-color-border': `hsl(${primitiveTokens.colors.neutral[200]})`,
  '--katalyst-color-border-secondary': `hsl(${primitiveTokens.colors.neutral[100]})`,
  '--katalyst-color-border-focus': `hsl(${primitiveTokens.colors.brand.emerald[500]})`,
  '--katalyst-color-border-error': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-border-success': `hsl(${primitiveTokens.colors.semantic.success})`,
  '--katalyst-color-border-warning': `hsl(${primitiveTokens.colors.semantic.warning})`,

  // Interactive colors
  '--katalyst-color-interactive-primary': `hsl(${primitiveTokens.colors.brand.emerald[500]})`,
  '--katalyst-color-interactive-primary-hover': `hsl(${primitiveTokens.colors.brand.emerald[600]})`,
  '--katalyst-color-interactive-primary-active': `hsl(${primitiveTokens.colors.brand.emerald[700]})`,
  '--katalyst-color-interactive-primary-disabled': `hsl(${primitiveTokens.colors.neutral[300]})`,

  '--katalyst-color-interactive-secondary': `hsl(${primitiveTokens.colors.neutral[100]})`,
  '--katalyst-color-interactive-secondary-hover': `hsl(${primitiveTokens.colors.neutral[200]})`,
  '--katalyst-color-interactive-secondary-active': `hsl(${primitiveTokens.colors.neutral[300]})`,
  '--katalyst-color-interactive-secondary-disabled': `hsl(${primitiveTokens.colors.neutral[50]})`,

  '--katalyst-color-interactive-destructive': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-interactive-destructive-hover': `hsl(0 84% 50%)`,
  '--katalyst-color-interactive-destructive-active': `hsl(0 84% 40%)`,
  '--katalyst-color-interactive-destructive-disabled': `hsl(${primitiveTokens.colors.neutral[300]})`,

  // Status colors
  '--katalyst-color-status-success': `hsl(${primitiveTokens.colors.semantic.success})`,
  '--katalyst-color-status-warning': `hsl(${primitiveTokens.colors.semantic.warning})`,
  '--katalyst-color-status-error': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-status-info': `hsl(${primitiveTokens.colors.semantic.info})`,

  // Component tokens
  '--katalyst-component-button-border-radius': primitiveTokens.borderRadius.md,
  '--katalyst-component-button-font-size': primitiveTokens.typography.fontSize.sm.size,
  '--katalyst-component-button-font-weight': primitiveTokens.typography.fontWeight.medium,
  '--katalyst-component-button-line-height': primitiveTokens.typography.fontSize.sm.lineHeight,
  '--katalyst-component-button-padding-x': primitiveTokens.spacing[4],
  '--katalyst-component-button-padding-y': primitiveTokens.spacing[2],
  '--katalyst-component-button-min-height': primitiveTokens.spacing[10],

  '--katalyst-component-card-border-radius': primitiveTokens.borderRadius.lg,
  '--katalyst-component-card-padding': primitiveTokens.spacing[6],
  '--katalyst-component-card-shadow': primitiveTokens.boxShadow.sm,
  '--katalyst-component-card-background': `hsl(${primitiveTokens.colors.neutral[0]})`,
  '--katalyst-component-card-border': `1px solid hsl(${primitiveTokens.colors.neutral[200]})`,

  '--katalyst-component-input-border-radius': primitiveTokens.borderRadius.md,
  '--katalyst-component-input-font-size': primitiveTokens.typography.fontSize.sm.size,
  '--katalyst-component-input-line-height': primitiveTokens.typography.fontSize.sm.lineHeight,
  '--katalyst-component-input-padding-x': primitiveTokens.spacing[3],
  '--katalyst-component-input-padding-y': primitiveTokens.spacing[2],
  '--katalyst-component-input-min-height': primitiveTokens.spacing[10],

  // Layout tokens
  '--katalyst-layout-container-max-width': '1400px',
  '--katalyst-layout-container-padding': primitiveTokens.spacing[4],
  '--katalyst-layout-section-spacing': primitiveTokens.spacing[24],
  '--katalyst-layout-section-padding-y': primitiveTokens.spacing[16],
  '--katalyst-layout-grid-gap': primitiveTokens.spacing[6],
  '--katalyst-layout-grid-columns': '12',
} as const;

export const darkTheme = {
  // Background colors
  '--katalyst-color-background': `hsl(${primitiveTokens.colors.neutral[900]})`,
  '--katalyst-color-background-secondary': `hsl(${primitiveTokens.colors.neutral[800]})`,
  '--katalyst-color-background-tertiary': `hsl(${primitiveTokens.colors.neutral[700]})`,
  '--katalyst-color-background-inverse': `hsl(${primitiveTokens.colors.neutral[0]})`,
  '--katalyst-color-background-overlay': `hsl(${primitiveTokens.colors.neutral[0]} / 0.5)`,

  // Text colors
  '--katalyst-color-text-primary': `hsl(${primitiveTokens.colors.neutral[0]})`,
  '--katalyst-color-text-secondary': `hsl(${primitiveTokens.colors.neutral[400]})`,
  '--katalyst-color-text-tertiary': `hsl(${primitiveTokens.colors.neutral[600]})`,
  '--katalyst-color-text-inverse': `hsl(${primitiveTokens.colors.neutral[900]})`,
  '--katalyst-color-text-disabled': `hsl(${primitiveTokens.colors.neutral[700]})`,
  '--katalyst-color-text-link': `hsl(${primitiveTokens.colors.brand.emerald[400]})`,
  '--katalyst-color-text-link-hover': `hsl(${primitiveTokens.colors.brand.emerald[300]})`,

  // Border colors
  '--katalyst-color-border': `hsl(${primitiveTokens.colors.neutral[700]})`,
  '--katalyst-color-border-secondary': `hsl(${primitiveTokens.colors.neutral[800]})`,
  '--katalyst-color-border-focus': `hsl(${primitiveTokens.colors.brand.emerald[400]})`,
  '--katalyst-color-border-error': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-border-success': `hsl(${primitiveTokens.colors.semantic.success})`,
  '--katalyst-color-border-warning': `hsl(${primitiveTokens.colors.semantic.warning})`,

  // Interactive colors (same as light theme, but adjusted for dark mode)
  '--katalyst-color-interactive-primary': `hsl(${primitiveTokens.colors.brand.emerald[500]})`,
  '--katalyst-color-interactive-primary-hover': `hsl(${primitiveTokens.colors.brand.emerald[400]})`,
  '--katalyst-color-interactive-primary-active': `hsl(${primitiveTokens.colors.brand.emerald[300]})`,
  '--katalyst-color-interactive-primary-disabled': `hsl(${primitiveTokens.colors.neutral[700]})`,

  '--katalyst-color-interactive-secondary': `hsl(${primitiveTokens.colors.neutral[800]})`,
  '--katalyst-color-interactive-secondary-hover': `hsl(${primitiveTokens.colors.neutral[700]})`,
  '--katalyst-color-interactive-secondary-active': `hsl(${primitiveTokens.colors.neutral[600]})`,
  '--katalyst-color-interactive-secondary-disabled': `hsl(${primitiveTokens.colors.neutral[850]})`,

  '--katalyst-color-interactive-destructive': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-interactive-destructive-hover': `hsl(0 84% 70%)`,
  '--katalyst-color-interactive-destructive-active': `hsl(0 84% 80%)`,
  '--katalyst-color-interactive-destructive-disabled': `hsl(${primitiveTokens.colors.neutral[700]})`,

  // Status colors
  '--katalyst-color-status-success': `hsl(${primitiveTokens.colors.semantic.success})`,
  '--katalyst-color-status-warning': `hsl(${primitiveTokens.colors.semantic.warning})`,
  '--katalyst-color-status-error': `hsl(${primitiveTokens.colors.semantic.error})`,
  '--katalyst-color-status-info': `hsl(${primitiveTokens.colors.semantic.info})`,

  // Component tokens (inherit from light theme)
  ...Object.fromEntries(
    Object.entries(lightTheme).filter(([key]) => key.startsWith('--katalyst-component-'))
  ),

  // Layout tokens (inherit from light theme)
  ...Object.fromEntries(
    Object.entries(lightTheme).filter(([key]) => key.startsWith('--katalyst-layout-'))
  ),

  // Dark-specific component overrides
  '--katalyst-component-card-background': `hsl(${primitiveTokens.colors.neutral[800]})`,
  '--katalyst-component-card-border': `1px solid hsl(${primitiveTokens.colors.neutral[700]})`,
} as const;

// =============================================================================
// FRAMEWORK-SPECIFIC CONFIGURATIONS
// =============================================================================

export const frameworkConfigs = {
  core: {
    cssVariablePrefix: '--katalyst',
    useModularScale: true,
    includeAnimations: true,
    optimizeForBundle: true,
  },
  nextjs: {
    cssVariablePrefix: '--katalyst',
    useModularScale: true,
    includeAnimations: true,
    optimizeForSSR: true,
  },
  remix: {
    cssVariablePrefix: '--katalyst',
    useModularScale: true,
    includeAnimations: true,
    optimizeForSSR: true,
  },
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type Theme = 'light' | 'dark' | 'system';
export type Framework = 'core' | 'nextjs' | 'remix';

export type PrimitiveTokens = typeof primitiveTokens;
export type SemanticTokens = typeof semanticTokens;
export type LightTheme = typeof lightTheme;
export type DarkTheme = typeof darkTheme;

export type ColorScale = keyof typeof primitiveTokens.colors.neutral;
export type BrandColor = keyof typeof primitiveTokens.colors.brand;
export type SemanticColor = keyof typeof primitiveTokens.colors.semantic;

export type SpacingScale = keyof typeof primitiveTokens.spacing;
export type FontSize = keyof typeof primitiveTokens.typography.fontSize;
export type FontWeight = keyof typeof primitiveTokens.typography.fontWeight;
export type BorderRadius = keyof typeof primitiveTokens.borderRadius;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate CSS custom properties for a theme
 */
export function generateThemeCSS(theme: 'light' | 'dark') {
  const themeTokens = theme === 'light' ? lightTheme : darkTheme;

  return Object.entries(themeTokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/**
 * Get a specific token value with fallback
 */
export function getToken<T extends keyof SemanticTokens>(
  category: T,
  path: string,
  fallback?: string
): string {
  const tokens = semanticTokens[category] as any;
  const value = path.split('.').reduce((obj, key) => obj?.[key], tokens);
  return value || fallback || '';
}

/**
 * Create a CSS variable reference
 */
export function cssVar(name: string, fallback?: string): string {
  const varName = name.startsWith('--') ? name : `--katalyst-${name}`;
  return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
}

/**
 * Convert theme tokens to Tailwind config
 */
export function toTailwindConfig(framework: Framework = 'core') {
  return {
    colors: {
      // Map semantic tokens to Tailwind color names
      background: {
        DEFAULT: cssVar('color-background'),
        secondary: cssVar('color-background-secondary'),
        tertiary: cssVar('color-background-tertiary'),
      },
      foreground: cssVar('color-text-primary'),
      primary: {
        DEFAULT: cssVar('color-interactive-primary'),
        foreground: cssVar('color-text-inverse'),
      },
      secondary: {
        DEFAULT: cssVar('color-interactive-secondary'),
        foreground: cssVar('color-text-primary'),
      },
      border: cssVar('color-border'),
      input: cssVar('color-border'),
      ring: cssVar('color-border-focus'),
    },
    spacing: primitiveTokens.spacing,
    fontSize: Object.fromEntries(
      Object.entries(primitiveTokens.typography.fontSize).map(([key, value]) => [
        key,
        [value.size, { lineHeight: value.lineHeight }],
      ])
    ),
    fontFamily: primitiveTokens.typography.fontFamily,
    fontWeight: primitiveTokens.typography.fontWeight,
    letterSpacing: primitiveTokens.typography.letterSpacing,
    borderRadius: primitiveTokens.borderRadius,
    boxShadow: primitiveTokens.boxShadow,
    zIndex: primitiveTokens.zIndex,
    transitionDuration: primitiveTokens.animation.duration,
    transitionTimingFunction: primitiveTokens.animation.easing,
  };
}

/**
 * Generate component-specific token configurations
 */
export function getComponentTokens(component: 'button' | 'card' | 'input') {
  const componentTokens = {
    button: {
      borderRadius: cssVar('component-button-border-radius'),
      fontSize: cssVar('component-button-font-size'),
      fontWeight: cssVar('component-button-font-weight'),
      lineHeight: cssVar('component-button-line-height'),
      paddingX: cssVar('component-button-padding-x'),
      paddingY: cssVar('component-button-padding-y'),
      minHeight: cssVar('component-button-min-height'),
    },
    card: {
      borderRadius: cssVar('component-card-border-radius'),
      padding: cssVar('component-card-padding'),
      shadow: cssVar('component-card-shadow'),
      background: cssVar('component-card-background'),
      border: cssVar('component-card-border'),
    },
    input: {
      borderRadius: cssVar('component-input-border-radius'),
      fontSize: cssVar('component-input-font-size'),
      lineHeight: cssVar('component-input-line-height'),
      paddingX: cssVar('component-input-padding-x'),
      paddingY: cssVar('component-input-padding-y'),
      minHeight: cssVar('component-input-min-height'),
    },
  };

  return componentTokens[component];
}

/**
 * Create CSS class utilities for spacing
 */
export function createSpacingUtilities() {
  const spacingClasses: Record<string, string> = {};

  Object.entries(primitiveTokens.spacing).forEach(([key, value]) => {
    spacingClasses[`katalyst-m-${key}`] = `margin: ${value}`;
    spacingClasses[`katalyst-mt-${key}`] = `margin-top: ${value}`;
    spacingClasses[`katalyst-mr-${key}`] = `margin-right: ${value}`;
    spacingClasses[`katalyst-mb-${key}`] = `margin-bottom: ${value}`;
    spacingClasses[`katalyst-ml-${key}`] = `margin-left: ${value}`;
    spacingClasses[`katalyst-mx-${key}`] = `margin-left: ${value}; margin-right: ${value}`;
    spacingClasses[`katalyst-my-${key}`] = `margin-top: ${value}; margin-bottom: ${value}`;

    spacingClasses[`katalyst-p-${key}`] = `padding: ${value}`;
    spacingClasses[`katalyst-pt-${key}`] = `padding-top: ${value}`;
    spacingClasses[`katalyst-pr-${key}`] = `padding-right: ${value}`;
    spacingClasses[`katalyst-pb-${key}`] = `padding-bottom: ${value}`;
    spacingClasses[`katalyst-pl-${key}`] = `padding-left: ${value}`;
    spacingClasses[`katalyst-px-${key}`] = `padding-left: ${value}; padding-right: ${value}`;
    spacingClasses[`katalyst-py-${key}`] = `padding-top: ${value}; padding-bottom: ${value}`;
  });

  return spacingClasses;
}

/**
 * Create responsive breakpoint system
 */
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Generate media query helper
 */
export function mediaQuery(breakpoint: Breakpoint): string {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
}

/**
 * Platform-specific token overrides
 */
export const platformTokens = {
  web: {
    '--katalyst-platform-touch-target': '44px',
    '--katalyst-platform-font-smoothing': 'antialiased',
  },
  mobile: {
    '--katalyst-platform-touch-target': '48px',
    '--katalyst-platform-font-smoothing': 'subpixel-antialiased',
  },
  desktop: {
    '--katalyst-platform-touch-target': '32px',
    '--katalyst-platform-font-smoothing': 'antialiased',
  },
} as const;

/**
 * Animation presets for common UI patterns
 */
export const animationPresets = {
  fadeIn: {
    keyframes: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    duration: primitiveTokens.animation.duration[300],
    easing: primitiveTokens.animation.easing.out,
  },
  slideUp: {
    keyframes: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    duration: primitiveTokens.animation.duration[300],
    easing: primitiveTokens.animation.easing['out-back'],
  },
  scaleIn: {
    keyframes: {
      '0%': { transform: 'scale(0.9)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    duration: primitiveTokens.animation.duration[200],
    easing: primitiveTokens.animation.easing['out-back'],
  },
  slideDown: {
    keyframes: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    duration: primitiveTokens.animation.duration[300],
    easing: primitiveTokens.animation.easing.out,
  },
} as const;

/**
 * Generate keyframe animations CSS
 */
export function generateKeyframes(name: keyof typeof animationPresets): string {
  const preset = animationPresets[name];
  const keyframeEntries = Object.entries(preset.keyframes)
    .map(([key, styles]) => {
      const styleEntries = Object.entries(styles as Record<string, string>)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ');
      return `${key} { ${styleEntries} }`;
    })
    .join('\n  ');

  return `@keyframes katalyst-${name} {\n  ${keyframeEntries}\n}`;
}

/**
 * Theme token validation
 */
export function validateTheme(theme: Record<string, string>): boolean {
  const requiredTokens = [
    '--katalyst-color-background',
    '--katalyst-color-text-primary',
    '--katalyst-color-interactive-primary',
    '--katalyst-color-border',
  ];

  return requiredTokens.every((token) => token in theme);
}

/**
 * Export all tokens for external consumption
 */
export const katalystTokens = {
  primitive: primitiveTokens,
  semantic: semanticTokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  framework: frameworkConfigs,
  breakpoints,
  animations: animationPresets,
  platform: platformTokens,
} as const;

// Default export for convenience
export default katalystTokens;
