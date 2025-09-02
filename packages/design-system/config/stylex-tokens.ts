/**
 * Katalyst Design System Tokens with StyleX
 *
 * Core design tokens powered by StyleX for atomic CSS generation
 * Provides type-safe, themeable design tokens across all platforms
 */

import * as stylex from '@stylexjs/stylex';

// Core Design Tokens
export const tokens = stylex.defineVars({
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

  // Typography
  fontFamilyBase: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMono: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
  fontFamilySerif: '"Crimson Pro", Georgia, serif',

  // Font Sizes - Type Scale (1.25 - Major Third)
  fontSizeXs: '0.75rem', // 12px
  fontSizeSm: '0.875rem', // 14px
  fontSizeBase: '1rem', // 16px
  fontSizeLg: '1.125rem', // 18px
  fontSizeXl: '1.25rem', // 20px
  fontSize2xl: '1.5rem', // 24px
  fontSize3xl: '1.875rem', // 30px
  fontSize4xl: '2.25rem', // 36px
  fontSize5xl: '3rem', // 48px
  fontSize6xl: '3.75rem', // 60px
  fontSize7xl: '4.5rem', // 72px
  fontSize8xl: '6rem', // 96px
  fontSize9xl: '8rem', // 128px

  // Font Weights
  fontWeightThin: '100',
  fontWeightExtralight: '200',
  fontWeightLight: '300',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  fontWeightExtrabold: '800',
  fontWeightBlack: '900',

  // Line Heights
  lineHeightTight: '1.25',
  lineHeightSnug: '1.375',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.625',
  lineHeightLoose: '2',

  // Letter Spacing
  letterSpacingTighter: '-0.05em',
  letterSpacingTight: '-0.025em',
  letterSpacingNormal: '0em',
  letterSpacingWide: '0.025em',
  letterSpacingWider: '0.05em',
  letterSpacingWidest: '0.1em',

  // Spacing Scale (1.5 - Perfect Fifth)
  space0: '0rem',
  space1: '0.25rem', // 4px
  space2: '0.5rem', // 8px
  space3: '0.75rem', // 12px
  space4: '1rem', // 16px
  space5: '1.25rem', // 20px
  space6: '1.5rem', // 24px
  space7: '1.75rem', // 28px
  space8: '2rem', // 32px
  space9: '2.25rem', // 36px
  space10: '2.5rem', // 40px
  space11: '2.75rem', // 44px
  space12: '3rem', // 48px
  space14: '3.5rem', // 56px
  space16: '4rem', // 64px
  space20: '5rem', // 80px
  space24: '6rem', // 96px
  space28: '7rem', // 112px
  space32: '8rem', // 128px
  space36: '9rem', // 144px
  space40: '10rem', // 160px
  space44: '11rem', // 176px
  space48: '12rem', // 192px
  space52: '13rem', // 208px
  space56: '14rem', // 224px
  space60: '15rem', // 240px
  space64: '16rem', // 256px
  space72: '18rem', // 288px
  space80: '20rem', // 320px
  space96: '24rem', // 384px

  // Border Radius
  borderRadiusNone: '0',
  borderRadiusXs: '0.125rem', // 2px
  borderRadiusSm: '0.25rem', // 4px
  borderRadius: '0.375rem', // 6px
  borderRadiusMd: '0.5rem', // 8px
  borderRadiusLg: '0.75rem', // 12px
  borderRadiusXl: '1rem', // 16px
  borderRadius2xl: '1.25rem', // 20px
  borderRadius3xl: '1.5rem', // 24px
  borderRadiusFull: '9999px',

  // Border Widths
  borderWidthNone: '0',
  borderWidth: '1px',
  borderWidth2: '2px',
  borderWidth4: '4px',
  borderWidth8: '8px',

  // Box Shadows
  shadowNone: 'none',
  shadowXs: '0 1px rgba(0, 0, 0, 0.05)',
  shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  shadow2xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  shadowInner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  shadowGlow: '0 0 20px rgba(59, 130, 246, 0.4)',

  // Z-Index Scale
  zAuto: 'auto',
  z0: '0',
  z10: '10',
  z20: '20',
  z30: '30',
  z40: '40',
  z50: '50',
  zDropdown: '1000',
  zSticky: '1020',
  zFixed: '1030',
  zModalBackdrop: '1040',
  zModal: '1050',
  zPopover: '1060',
  zTooltip: '1070',
  zToast: '1080',
  zMax: '2147483647',

  // Transitions
  transitionDurationFast: '150ms',
  transitionDurationNormal: '200ms',
  transitionDurationSlow: '300ms',
  transitionDurationSlower: '500ms',
  transitionDurationSlowest: '1000ms',

  transitionTimingLinear: 'linear',
  transitionTimingEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
  transitionTimingEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
  transitionTimingEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  transitionTimingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Breakpoints (for media queries)
  breakpointSm: '640px',
  breakpointMd: '768px',
  breakpointLg: '1024px',
  breakpointXl: '1280px',
  breakpoint2xl: '1536px',

  // Container Max Widths
  containerSm: '640px',
  containerMd: '768px',
  containerLg: '1024px',
  containerXl: '1280px',
  container2xl: '1536px',

  // Animation Durations
  animationDurationSpin: '1s',
  animationDurationPing: '1s',
  animationDurationPulse: '2s',
  animationDurationBounce: '1s',

  // Opacity Scale
  opacity0: '0',
  opacity5: '0.05',
  opacity10: '0.1',
  opacity20: '0.2',
  opacity25: '0.25',
  opacity30: '0.3',
  opacity40: '0.4',
  opacity50: '0.5',
  opacity60: '0.6',
  opacity70: '0.7',
  opacity75: '0.75',
  opacity80: '0.8',
  opacity90: '0.9',
  opacity95: '0.95',
  opacity100: '1',
});

// Component Tokens
export const componentTokens = stylex.defineVars({
  // Button
  buttonHeightSm: '2rem',
  buttonHeightMd: '2.5rem',
  buttonHeightLg: '3rem',
  buttonHeightXl: '3.5rem',

  buttonPaddingXSm: tokens.space3,
  buttonPaddingXMd: tokens.space4,
  buttonPaddingXLg: tokens.space6,
  buttonPaddingXXl: tokens.space8,

  // Input
  inputHeightSm: '2rem',
  inputHeightMd: '2.5rem',
  inputHeightLg: '3rem',
  inputHeightXl: '3.5rem',

  inputPaddingXSm: tokens.space3,
  inputPaddingXMd: tokens.space4,
  inputPaddingXLg: tokens.space4,
  inputPaddingXXl: tokens.space6,

  // Card
  cardPadding: tokens.space6,
  cardPaddingSm: tokens.space4,
  cardPaddingLg: tokens.space8,

  // Modal
  modalMaxWidth: '32rem',
  modalMaxWidthSm: '24rem',
  modalMaxWidthLg: '42rem',
  modalMaxWidthXl: '48rem',
  modalMaxWidth2xl: '56rem',

  // Navigation
  navbarHeight: '4rem',
  sidebarWidth: '16rem',
  sidebarWidthCollapsed: '4rem',

  // Content
  contentMaxWidth: '65ch',
  contentMaxWidthWide: '80ch',
  contentMaxWidthNarrow: '50ch',
});

// Semantic Color Mappings for different states
export const semanticColors = stylex.defineVars({
  // Interactive states
  stateHover: tokens.colorHover,
  stateActive: tokens.colorActive,
  stateFocus: tokens.colorFocus,
  stateDisabled: 'rgba(0, 0, 0, 0.3)',

  // Status colors
  statusSuccess: tokens.colorSuccess,
  statusWarning: tokens.colorWarning,
  statusError: tokens.colorError,
  statusInfo: tokens.colorInfo,

  // Data visualization
  chartBlue: '#3b82f6',
  chartIndigo: '#6366f1',
  chartPurple: '#8b5cf6',
  chartPink: '#ec4899',
  chartRed: '#ef4444',
  chartOrange: '#f97316',
  chartYellow: '#eab308',
  chartGreen: '#22c55e',
  chartTeal: '#14b8a6',
  chartCyan: '#06b6d4',
});

// Platform-specific tokens
export const platformTokens = stylex.defineVars({
  // Mobile-specific
  touchTargetSize: '44px',
  tapHighlightColor: 'transparent',

  // Web-specific
  focusRingWidth: '2px',
  focusRingOffset: '2px',

  // Print-specific
  printColorAdjust: 'exact',
});

// Accessibility tokens
export const a11yTokens = stylex.defineVars({
  // Minimum contrast ratios
  contrastMinimum: '4.5',
  contrastEnhanced: '7',

  // Focus indicators
  focusIndicatorWidth: '2px',
  focusIndicatorStyle: 'solid',
  focusIndicatorColor: tokens.colorFocus,

  // Animation preferences
  motionReduce: 'reduce',
  motionNoPreference: 'no-preference',

  // High contrast
  highContrastBorder: '1px solid',
  highContrastBackground: 'Canvas',
  highContrastForeground: 'CanvasText',
});

// Export combined tokens for easy import
export const allTokens = {
  ...tokens,
  ...componentTokens,
  ...semanticColors,
  ...platformTokens,
  ...a11yTokens,
};

// Type-safe token access
export type TokenKey = keyof typeof allTokens;
export type TokenValue = string;
