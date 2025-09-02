/**
 * Katalyst Design System Themes with StyleX
 *
 * Multiple brand themes and variations using StyleX's theming system
 * Provides compile-time theme generation with zero runtime overhead
 */

import * as stylex from '@stylexjs/stylex';
import { tokens } from './stylex-tokens';

// Light Theme (Default)
export const lightTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#3b82f6',
  colorBrandSecondary: '#8b5cf6',
  colorBrandAccent: '#06b6d4',

  // Semantic Colors
  colorPrimary: '#3b82f6',
  colorPrimaryHover: '#2563eb',
  colorPrimaryActive: '#1d4ed8',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#64748b',
  colorSecondaryHover: '#475569',
  colorSecondaryActive: '#334155',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#22c55e',
  colorSuccessHover: '#16a34a',
  colorSuccessActive: '#15803d',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#f59e0b',
  colorWarningHover: '#d97706',
  colorWarningActive: '#b45309',
  colorWarningForeground: '#ffffff',

  colorError: '#ef4444',
  colorErrorHover: '#dc2626',
  colorErrorActive: '#b91c1c',
  colorErrorForeground: '#ffffff',

  colorInfo: '#06b6d4',
  colorInfoHover: '#0891b2',
  colorInfoActive: '#0e7490',
  colorInfoForeground: '#ffffff',

  // Neutral Colors
  colorBackground: '#ffffff',
  colorBackgroundSecondary: '#f8fafc',
  colorBackgroundMuted: '#f1f5f9',
  colorBackgroundSubtle: '#e2e8f0',

  colorForeground: '#0f172a',
  colorForegroundSecondary: '#334155',
  colorForegroundMuted: '#64748b',
  colorForegroundSubtle: '#94a3b8',

  colorBorder: '#e2e8f0',
  colorBorderSecondary: '#cbd5e1',
  colorBorderMuted: '#94a3b8',
  colorBorderSubtle: '#f1f5f9',

  // Interactive Colors
  colorHover: 'rgba(59, 130, 246, 0.05)',
  colorActive: 'rgba(59, 130, 246, 0.1)',
  colorFocus: '#3b82f6',
  colorSelection: 'rgba(59, 130, 246, 0.2)',
});

// Dark Theme
export const darkTheme = stylex.createTheme(tokens, {
  // Brand Colors (adjusted for dark mode)
  colorBrandPrimary: '#60a5fa',
  colorBrandSecondary: '#a78bfa',
  colorBrandAccent: '#22d3ee',

  // Semantic Colors
  colorPrimary: '#60a5fa',
  colorPrimaryHover: '#3b82f6',
  colorPrimaryActive: '#2563eb',
  colorPrimaryForeground: '#0f172a',

  colorSecondary: '#94a3b8',
  colorSecondaryHover: '#64748b',
  colorSecondaryActive: '#475569',
  colorSecondaryForeground: '#0f172a',

  colorSuccess: '#4ade80',
  colorSuccessHover: '#22c55e',
  colorSuccessActive: '#16a34a',
  colorSuccessForeground: '#0f172a',

  colorWarning: '#fbbf24',
  colorWarningHover: '#f59e0b',
  colorWarningActive: '#d97706',
  colorWarningForeground: '#0f172a',

  colorError: '#f87171',
  colorErrorHover: '#ef4444',
  colorErrorActive: '#dc2626',
  colorErrorForeground: '#ffffff',

  colorInfo: '#38bdf8',
  colorInfoHover: '#0ea5e9',
  colorInfoActive: '#0284c7',
  colorInfoForeground: '#0f172a',

  // Neutral Colors (dark mode palette)
  colorBackground: '#0f172a',
  colorBackgroundSecondary: '#1e293b',
  colorBackgroundMuted: '#334155',
  colorBackgroundSubtle: '#475569',

  colorForeground: '#f8fafc',
  colorForegroundSecondary: '#e2e8f0',
  colorForegroundMuted: '#cbd5e1',
  colorForegroundSubtle: '#94a3b8',

  colorBorder: '#334155',
  colorBorderSecondary: '#475569',
  colorBorderMuted: '#64748b',
  colorBorderSubtle: '#1e293b',

  // Interactive Colors
  colorHover: 'rgba(96, 165, 250, 0.1)',
  colorActive: 'rgba(96, 165, 250, 0.2)',
  colorFocus: '#60a5fa',
  colorSelection: 'rgba(96, 165, 250, 0.3)',
});

// SWC Studio Brand Theme
export const swcStudioTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#8b5cf6',
  colorBrandSecondary: '#a855f7',
  colorBrandAccent: '#ec4899',

  // Semantic Colors
  colorPrimary: '#8b5cf6',
  colorPrimaryHover: '#7c3aed',
  colorPrimaryActive: '#6d28d9',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#a855f7',
  colorSecondaryHover: '#9333ea',
  colorSecondaryActive: '#7e22ce',
  colorSecondaryForeground: '#ffffff',

  // Rest inherit from light theme
  colorSuccess: '#22c55e',
  colorSuccessHover: '#16a34a',
  colorSuccessActive: '#15803d',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#f59e0b',
  colorWarningHover: '#d97706',
  colorWarningActive: '#b45309',
  colorWarningForeground: '#ffffff',

  colorError: '#ef4444',
  colorErrorHover: '#dc2626',
  colorErrorActive: '#b91c1c',
  colorErrorForeground: '#ffffff',

  colorInfo: '#06b6d4',
  colorInfoHover: '#0891b2',
  colorInfoActive: '#0e7490',
  colorInfoForeground: '#ffffff',

  // Neutral Colors
  colorBackground: '#ffffff',
  colorBackgroundSecondary: '#faf7ff',
  colorBackgroundMuted: '#f3f0ff',
  colorBackgroundSubtle: '#ede9fe',

  colorForeground: '#0f172a',
  colorForegroundSecondary: '#334155',
  colorForegroundMuted: '#64748b',
  colorForegroundSubtle: '#94a3b8',

  colorBorder: '#ede9fe',
  colorBorderSecondary: '#ddd6fe',
  colorBorderMuted: '#c4b5fd',
  colorBorderSubtle: '#f3f0ff',

  // Interactive Colors
  colorHover: 'rgba(139, 92, 246, 0.05)',
  colorActive: 'rgba(139, 92, 246, 0.1)',
  colorFocus: '#8b5cf6',
  colorSelection: 'rgba(139, 92, 246, 0.2)',
});

// Enterprise Theme
export const enterpriseTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#059669',
  colorBrandSecondary: '#047857',
  colorBrandAccent: '#0d9488',

  // Semantic Colors
  colorPrimary: '#059669',
  colorPrimaryHover: '#047857',
  colorPrimaryActive: '#065f46',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#6b7280',
  colorSecondaryHover: '#4b5563',
  colorSecondaryActive: '#374151',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#059669',
  colorSuccessHover: '#047857',
  colorSuccessActive: '#065f46',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#d97706',
  colorWarningHover: '#b45309',
  colorWarningActive: '#92400e',
  colorWarningForeground: '#ffffff',

  colorError: '#dc2626',
  colorErrorHover: '#b91c1c',
  colorErrorActive: '#991b1b',
  colorErrorForeground: '#ffffff',

  colorInfo: '#0891b2',
  colorInfoHover: '#0e7490',
  colorInfoActive: '#155e75',
  colorInfoForeground: '#ffffff',

  // Neutral Colors
  colorBackground: '#ffffff',
  colorBackgroundSecondary: '#f9fafb',
  colorBackgroundMuted: '#f3f4f6',
  colorBackgroundSubtle: '#e5e7eb',

  colorForeground: '#111827',
  colorForegroundSecondary: '#374151',
  colorForegroundMuted: '#6b7280',
  colorForegroundSubtle: '#9ca3af',

  colorBorder: '#e5e7eb',
  colorBorderSecondary: '#d1d5db',
  colorBorderMuted: '#9ca3af',
  colorBorderSubtle: '#f3f4f6',

  // Interactive Colors
  colorHover: 'rgba(5, 150, 105, 0.05)',
  colorActive: 'rgba(5, 150, 105, 0.1)',
  colorFocus: '#059669',
  colorSelection: 'rgba(5, 150, 105, 0.2)',
});

// High Contrast Theme (Accessibility)
export const highContrastTheme = stylex.createTheme(tokens, {
  // Brand Colors (high contrast)
  colorBrandPrimary: '#000000',
  colorBrandSecondary: '#000000',
  colorBrandAccent: '#000000',

  // Semantic Colors
  colorPrimary: '#000000',
  colorPrimaryHover: '#333333',
  colorPrimaryActive: '#666666',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#666666',
  colorSecondaryHover: '#333333',
  colorSecondaryActive: '#000000',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#006600',
  colorSuccessHover: '#004400',
  colorSuccessActive: '#002200',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#ff6600',
  colorWarningHover: '#cc5500',
  colorWarningActive: '#994400',
  colorWarningForeground: '#ffffff',

  colorError: '#cc0000',
  colorErrorHover: '#990000',
  colorErrorActive: '#660000',
  colorErrorForeground: '#ffffff',

  colorInfo: '#0066cc',
  colorInfoHover: '#0055aa',
  colorInfoActive: '#004488',
  colorInfoForeground: '#ffffff',

  // Neutral Colors (maximum contrast)
  colorBackground: '#ffffff',
  colorBackgroundSecondary: '#f5f5f5',
  colorBackgroundMuted: '#e5e5e5',
  colorBackgroundSubtle: '#d5d5d5',

  colorForeground: '#000000',
  colorForegroundSecondary: '#333333',
  colorForegroundMuted: '#666666',
  colorForegroundSubtle: '#999999',

  colorBorder: '#000000',
  colorBorderSecondary: '#333333',
  colorBorderMuted: '#666666',
  colorBorderSubtle: '#cccccc',

  // Interactive Colors
  colorHover: 'rgba(0, 0, 0, 0.1)',
  colorActive: 'rgba(0, 0, 0, 0.2)',
  colorFocus: '#000000',
  colorSelection: 'rgba(0, 0, 0, 0.3)',
});

// Dark High Contrast Theme
export const darkHighContrastTheme = stylex.createTheme(tokens, {
  // Brand Colors (dark high contrast)
  colorBrandPrimary: '#ffffff',
  colorBrandSecondary: '#ffffff',
  colorBrandAccent: '#ffffff',

  // Semantic Colors
  colorPrimary: '#ffffff',
  colorPrimaryHover: '#cccccc',
  colorPrimaryActive: '#999999',
  colorPrimaryForeground: '#000000',

  colorSecondary: '#cccccc',
  colorSecondaryHover: '#ffffff',
  colorSecondaryActive: '#999999',
  colorSecondaryForeground: '#000000',

  colorSuccess: '#00ff00',
  colorSuccessHover: '#00cc00',
  colorSuccessActive: '#009900',
  colorSuccessForeground: '#000000',

  colorWarning: '#ffcc00',
  colorWarningHover: '#ffaa00',
  colorWarningActive: '#ff8800',
  colorWarningForeground: '#000000',

  colorError: '#ff3333',
  colorErrorHover: '#ff0000',
  colorErrorActive: '#cc0000',
  colorErrorForeground: '#000000',

  colorInfo: '#3399ff',
  colorInfoHover: '#0077ff',
  colorInfoActive: '#0055cc',
  colorInfoForeground: '#000000',

  // Neutral Colors (dark maximum contrast)
  colorBackground: '#000000',
  colorBackgroundSecondary: '#1a1a1a',
  colorBackgroundMuted: '#2a2a2a',
  colorBackgroundSubtle: '#3a3a3a',

  colorForeground: '#ffffff',
  colorForegroundSecondary: '#cccccc',
  colorForegroundMuted: '#999999',
  colorForegroundSubtle: '#666666',

  colorBorder: '#ffffff',
  colorBorderSecondary: '#cccccc',
  colorBorderMuted: '#999999',
  colorBorderSubtle: '#333333',

  // Interactive Colors
  colorHover: 'rgba(255, 255, 255, 0.1)',
  colorActive: 'rgba(255, 255, 255, 0.2)',
  colorFocus: '#ffffff',
  colorSelection: 'rgba(255, 255, 255, 0.3)',
});

// Ocean Theme (Blue-focused)
export const oceanTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#0ea5e9',
  colorBrandSecondary: '#0284c7',
  colorBrandAccent: '#06b6d4',

  // Semantic Colors
  colorPrimary: '#0ea5e9',
  colorPrimaryHover: '#0284c7',
  colorPrimaryActive: '#0369a1',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#64748b',
  colorSecondaryHover: '#475569',
  colorSecondaryActive: '#334155',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#06b6d4',
  colorSuccessHover: '#0891b2',
  colorSuccessActive: '#0e7490',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#f59e0b',
  colorWarningHover: '#d97706',
  colorWarningActive: '#b45309',
  colorWarningForeground: '#ffffff',

  colorError: '#ef4444',
  colorErrorHover: '#dc2626',
  colorErrorActive: '#b91c1c',
  colorErrorForeground: '#ffffff',

  colorInfo: '#0ea5e9',
  colorInfoHover: '#0284c7',
  colorInfoActive: '#0369a1',
  colorInfoForeground: '#ffffff',

  // Neutral Colors (ocean-tinted)
  colorBackground: '#fafbfc',
  colorBackgroundSecondary: '#f0f9ff',
  colorBackgroundMuted: '#e0f2fe',
  colorBackgroundSubtle: '#bae6fd',

  colorForeground: '#0c4a6e',
  colorForegroundSecondary: '#075985',
  colorForegroundMuted: '#0369a1',
  colorForegroundSubtle: '#0284c7',

  colorBorder: '#bae6fd',
  colorBorderSecondary: '#7dd3fc',
  colorBorderMuted: '#38bdf8',
  colorBorderSubtle: '#e0f2fe',

  // Interactive Colors
  colorHover: 'rgba(14, 165, 233, 0.05)',
  colorActive: 'rgba(14, 165, 233, 0.1)',
  colorFocus: '#0ea5e9',
  colorSelection: 'rgba(14, 165, 233, 0.2)',
});

// Sunset Theme (Warm colors)
export const sunsetTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#f97316',
  colorBrandSecondary: '#ea580c',
  colorBrandAccent: '#dc2626',

  // Semantic Colors
  colorPrimary: '#f97316',
  colorPrimaryHover: '#ea580c',
  colorPrimaryActive: '#c2410c',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#a855f7',
  colorSecondaryHover: '#9333ea',
  colorSecondaryActive: '#7e22ce',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#22c55e',
  colorSuccessHover: '#16a34a',
  colorSuccessActive: '#15803d',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#f59e0b',
  colorWarningHover: '#d97706',
  colorWarningActive: '#b45309',
  colorWarningForeground: '#ffffff',

  colorError: '#dc2626',
  colorErrorHover: '#b91c1c',
  colorErrorActive: '#991b1b',
  colorErrorForeground: '#ffffff',

  colorInfo: '#06b6d4',
  colorInfoHover: '#0891b2',
  colorInfoActive: '#0e7490',
  colorInfoForeground: '#ffffff',

  // Neutral Colors (warm-tinted)
  colorBackground: '#fffbf7',
  colorBackgroundSecondary: '#fff7ed',
  colorBackgroundMuted: '#fed7aa',
  colorBackgroundSubtle: '#fdba74',

  colorForeground: '#431407',
  colorForegroundSecondary: '#9a3412',
  colorForegroundMuted: '#c2410c',
  colorForegroundSubtle: '#ea580c',

  colorBorder: '#fed7aa',
  colorBorderSecondary: '#fdba74',
  colorBorderMuted: '#fb923c',
  colorBorderSubtle: '#fff7ed',

  // Interactive Colors
  colorHover: 'rgba(249, 115, 22, 0.05)',
  colorActive: 'rgba(249, 115, 22, 0.1)',
  colorFocus: '#f97316',
  colorSelection: 'rgba(249, 115, 22, 0.2)',
});

// Forest Theme (Green-focused)
export const forestTheme = stylex.createTheme(tokens, {
  // Brand Colors
  colorBrandPrimary: '#16a34a',
  colorBrandSecondary: '#15803d',
  colorBrandAccent: '#059669',

  // Semantic Colors
  colorPrimary: '#16a34a',
  colorPrimaryHover: '#15803d',
  colorPrimaryActive: '#166534',
  colorPrimaryForeground: '#ffffff',

  colorSecondary: '#64748b',
  colorSecondaryHover: '#475569',
  colorSecondaryActive: '#334155',
  colorSecondaryForeground: '#ffffff',

  colorSuccess: '#16a34a',
  colorSuccessHover: '#15803d',
  colorSuccessActive: '#166534',
  colorSuccessForeground: '#ffffff',

  colorWarning: '#d97706',
  colorWarningHover: '#b45309',
  colorWarningActive: '#92400e',
  colorWarningForeground: '#ffffff',

  colorError: '#dc2626',
  colorErrorHover: '#b91c1c',
  colorErrorActive: '#991b1b',
  colorErrorForeground: '#ffffff',

  colorInfo: '#059669',
  colorInfoHover: '#047857',
  colorInfoActive: '#065f46',
  colorInfoForeground: '#ffffff',

  // Neutral Colors (nature-tinted)
  colorBackground: '#f9fdf9',
  colorBackgroundSecondary: '#f0fdf4',
  colorBackgroundMuted: '#dcfce7',
  colorBackgroundSubtle: '#bbf7d0',

  colorForeground: '#14532d',
  colorForegroundSecondary: '#166534',
  colorForegroundMuted: '#15803d',
  colorForegroundSubtle: '#16a34a',

  colorBorder: '#dcfce7',
  colorBorderSecondary: '#bbf7d0',
  colorBorderMuted: '#86efac',
  colorBorderSubtle: '#f0fdf4',

  // Interactive Colors
  colorHover: 'rgba(22, 163, 74, 0.05)',
  colorActive: 'rgba(22, 163, 74, 0.1)',
  colorFocus: '#16a34a',
  colorSelection: 'rgba(22, 163, 74, 0.2)',
});

// Theme collections for easy access
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  swcStudio: swcStudioTheme,
  enterprise: enterpriseTheme,
  highContrast: highContrastTheme,
  darkHighContrast: darkHighContrastTheme,
  ocean: oceanTheme,
  sunset: sunsetTheme,
  forest: forestTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Theme utilities
export function getTheme(themeName: ThemeName) {
  return themes[themeName];
}

export function createCustomTheme(
  baseTheme: ThemeName,
  overrides: Partial<Record<keyof typeof tokens, string>>
) {
  return stylex.createTheme(tokens, {
    ...themes[baseTheme],
    ...overrides,
  });
}

// Theme metadata
export const themeMetadata = {
  light: {
    name: 'Light',
    description: 'Clean light theme for optimal readability',
    colorScheme: 'light',
    category: 'standard',
  },
  dark: {
    name: 'Dark',
    description: 'Modern dark theme for reduced eye strain',
    colorScheme: 'dark',
    category: 'standard',
  },
  swcStudio: {
    name: 'SWC Studio',
    description: 'Purple-focused brand theme for SWC Studio',
    colorScheme: 'light',
    category: 'brand',
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Professional green theme for enterprise use',
    colorScheme: 'light',
    category: 'brand',
  },
  highContrast: {
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colorScheme: 'light',
    category: 'accessibility',
  },
  darkHighContrast: {
    name: 'Dark High Contrast',
    description: 'Dark theme with maximum contrast',
    colorScheme: 'dark',
    category: 'accessibility',
  },
  ocean: {
    name: 'Ocean',
    description: 'Blue-focused theme inspired by the ocean',
    colorScheme: 'light',
    category: 'nature',
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange and purple theme',
    colorScheme: 'light',
    category: 'nature',
  },
  forest: {
    name: 'Forest',
    description: 'Green-focused theme inspired by nature',
    colorScheme: 'light',
    category: 'nature',
  },
} as const;

export type ThemeMetadata = typeof themeMetadata;
