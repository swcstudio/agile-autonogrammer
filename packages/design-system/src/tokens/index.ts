/**
 * Katalyst Design System - Design Tokens
 * 
 * A comprehensive token system for consistent theming across all components.
 * Based on Ant Design 5.0 token system with Radix UI color scales.
 */

import * as colors from '@radix-ui/colors';

// ============================================================================
// Core Token Types
// ============================================================================

export interface ColorTokens {
  // Primary Colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryBg: string;
  primaryBgHover: string;
  primaryBorder: string;
  primaryBorderHover: string;
  primaryText: string;
  primaryTextHover: string;
  primaryTextActive: string;

  // Success Colors
  success: string;
  successHover: string;
  successActive: string;
  successBg: string;
  successBgHover: string;
  successBorder: string;
  successBorderHover: string;
  successText: string;
  successTextHover: string;
  successTextActive: string;

  // Warning Colors
  warning: string;
  warningHover: string;
  warningActive: string;
  warningBg: string;
  warningBgHover: string;
  warningBorder: string;
  warningBorderHover: string;
  warningText: string;
  warningTextHover: string;
  warningTextActive: string;

  // Error Colors
  error: string;
  errorHover: string;
  errorActive: string;
  errorBg: string;
  errorBgHover: string;
  errorBorder: string;
  errorBorderHover: string;
  errorText: string;
  errorTextHover: string;
  errorTextActive: string;

  // Info Colors
  info: string;
  infoHover: string;
  infoActive: string;
  infoBg: string;
  infoBgHover: string;
  infoBorder: string;
  infoBorderHover: string;
  infoText: string;
  infoTextHover: string;
  infoTextActive: string;

  // Neutral Colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  textDisabled: string;
  textPlaceholder: string;
  
  bg: string;
  bgContainer: string;
  bgElevated: string;
  bgSpotlight: string;
  bgMask: string;
  
  border: string;
  borderSecondary: string;
  divider: string;
  
  // Semantic Colors
  link: string;
  linkHover: string;
  linkActive: string;
  linkVisited: string;
  
  highlight: string;
  highlightBg: string;
}

export interface SizeTokens {
  // Font Sizes
  fontSizeXS: number;
  fontSizeSM: number;
  fontSize: number;
  fontSizeLG: number;
  fontSizeXL: number;
  fontSizeXXL: number;
  fontSizeXXXL: number;
  
  // Font Weights
  fontWeightLight: number;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;
  
  // Line Heights
  lineHeightXS: number;
  lineHeightSM: number;
  lineHeight: number;
  lineHeightLG: number;
  lineHeightXL: number;
  lineHeightXXL: number;
  
  // Heading Line Heights
  lineHeightHeading1: number;
  lineHeightHeading2: number;
  lineHeightHeading3: number;
  lineHeightHeading4: number;
  lineHeightHeading5: number;
}

export interface SpacingTokens {
  // Margin/Padding Scale
  marginXXS: number;
  marginXS: number;
  marginSM: number;
  margin: number;
  marginMD: number;
  marginLG: number;
  marginXL: number;
  marginXXL: number;
  
  paddingXXS: number;
  paddingXS: number;
  paddingSM: number;
  padding: number;
  paddingMD: number;
  paddingLG: number;
  paddingXL: number;
  paddingXXL: number;
  
  // Component Specific
  paddingContentHorizontalLG: number;
  paddingContentHorizontal: number;
  paddingContentHorizontalSM: number;
  paddingContentVerticalLG: number;
  paddingContentVertical: number;
  paddingContentVerticalSM: number;
}

export interface MotionTokens {
  // Duration
  motionDurationFast: string;
  motionDurationMid: string;
  motionDurationSlow: string;
  
  // Easing
  motionEaseInOut: string;
  motionEaseOut: string;
  motionEaseIn: string;
  motionEaseInBack: string;
  motionEaseOutBack: string;
  motionEaseInOutCirc: string;
  motionEaseOutCirc: string;
}

export interface RadiusTokens {
  borderRadiusXS: number;
  borderRadiusSM: number;
  borderRadius: number;
  borderRadiusLG: number;
  borderRadiusXL: number;
  borderRadiusOuter: number;
}

export interface ShadowTokens {
  boxShadow: string;
  boxShadowSecondary: string;
  boxShadowTertiary: string;
  boxShadowPopover: string;
  boxShadowCard: string;
  boxShadowDrawerRight: string;
  boxShadowDrawerLeft: string;
  boxShadowDrawerUp: string;
  boxShadowDrawerDown: string;
  boxShadowTabsOverflowLeft: string;
  boxShadowTabsOverflowRight: string;
  boxShadowTabsOverflowTop: string;
  boxShadowTabsOverflowBottom: string;
}

export interface ScreenTokens {
  screenXS: number;
  screenXSMin: number;
  screenXSMax: number;
  screenSM: number;
  screenSMMin: number;
  screenSMMax: number;
  screenMD: number;
  screenMDMin: number;
  screenMDMax: number;
  screenLG: number;
  screenLGMin: number;
  screenLGMax: number;
  screenXL: number;
  screenXLMin: number;
  screenXLMax: number;
  screenXXL: number;
  screenXXLMin: number;
}

export interface ControlTokens {
  // Control Heights
  controlHeightXS: number;
  controlHeightSM: number;
  controlHeight: number;
  controlHeightLG: number;
  
  // Interactive States
  controlOutline: string;
  controlOutlineWidth: number;
  controlItemBgHover: string;
  controlItemBgActive: string;
  controlItemBgActiveHover: string;
  controlItemBgActiveDisabled: string;
  controlInteractiveSize: number;
  
  // Padding
  controlPaddingHorizontal: number;
  controlPaddingHorizontalSM: number;
}

export interface ZIndexTokens {
  zIndexBase: number;
  zIndexPopupBase: number;
  zIndexDropdown: number;
  zIndexPicker: number;
  zIndexPopover: number;
  zIndexTooltip: number;
  zIndexFixedNav: number;
  zIndexModalMask: number;
  zIndexModal: number;
  zIndexNotification: number;
  zIndexMessage: number;
  zIndexPopconfirm: number;
  zIndexSpin: number;
}

export interface WireframeTokens {
  wireframe: boolean;
}

// ============================================================================
// Global Token Interface
// ============================================================================

export interface GlobalToken 
  extends ColorTokens,
    SizeTokens,
    SpacingTokens,
    MotionTokens,
    RadiusTokens,
    ShadowTokens,
    ScreenTokens,
    ControlTokens,
    ZIndexTokens,
    WireframeTokens {
  // Font Families
  fontFamily: string;
  fontFamilyCode: string;
  
  // Misc
  opacity: number;
  opacityHover: number;
  opacityDisabled: number;
  opacityLoading: number;
}

// ============================================================================
// Default Light Theme Tokens
// ============================================================================

export const lightTokens: GlobalToken = {
  // Primary Colors
  primary: colors.blue.blue9,
  primaryHover: colors.blue.blue10,
  primaryActive: colors.blue.blue11,
  primaryBg: colors.blue.blue3,
  primaryBgHover: colors.blue.blue4,
  primaryBorder: colors.blue.blue6,
  primaryBorderHover: colors.blue.blue7,
  primaryText: colors.blue.blue11,
  primaryTextHover: colors.blue.blue12,
  primaryTextActive: colors.blue.blue12,

  // Success Colors
  success: colors.green.green9,
  successHover: colors.green.green10,
  successActive: colors.green.green11,
  successBg: colors.green.green3,
  successBgHover: colors.green.green4,
  successBorder: colors.green.green6,
  successBorderHover: colors.green.green7,
  successText: colors.green.green11,
  successTextHover: colors.green.green12,
  successTextActive: colors.green.green12,

  // Warning Colors
  warning: colors.amber.amber9,
  warningHover: colors.amber.amber10,
  warningActive: colors.amber.amber11,
  warningBg: colors.amber.amber3,
  warningBgHover: colors.amber.amber4,
  warningBorder: colors.amber.amber6,
  warningBorderHover: colors.amber.amber7,
  warningText: colors.amber.amber11,
  warningTextHover: colors.amber.amber12,
  warningTextActive: colors.amber.amber12,

  // Error Colors
  error: colors.red.red9,
  errorHover: colors.red.red10,
  errorActive: colors.red.red11,
  errorBg: colors.red.red3,
  errorBgHover: colors.red.red4,
  errorBorder: colors.red.red6,
  errorBorderHover: colors.red.red7,
  errorText: colors.red.red11,
  errorTextHover: colors.red.red12,
  errorTextActive: colors.red.red12,

  // Info Colors
  info: colors.cyan.cyan9,
  infoHover: colors.cyan.cyan10,
  infoActive: colors.cyan.cyan11,
  infoBg: colors.cyan.cyan3,
  infoBgHover: colors.cyan.cyan4,
  infoBorder: colors.cyan.cyan6,
  infoBorderHover: colors.cyan.cyan7,
  infoText: colors.cyan.cyan11,
  infoTextHover: colors.cyan.cyan12,
  infoTextActive: colors.cyan.cyan12,

  // Neutral Colors
  text: colors.gray.gray12,
  textSecondary: colors.gray.gray11,
  textTertiary: colors.gray.gray9,
  textQuaternary: colors.gray.gray8,
  textDisabled: colors.gray.gray7,
  textPlaceholder: colors.gray.gray8,
  
  bg: '#ffffff',
  bgContainer: colors.gray.gray1,
  bgElevated: '#ffffff',
  bgSpotlight: colors.gray.gray3,
  bgMask: 'rgba(0, 0, 0, 0.45)',
  
  border: colors.gray.gray6,
  borderSecondary: colors.gray.gray4,
  divider: colors.gray.gray5,
  
  // Semantic Colors
  link: colors.blue.blue9,
  linkHover: colors.blue.blue10,
  linkActive: colors.blue.blue11,
  linkVisited: colors.purple.purple9,
  
  highlight: colors.red.red9,
  highlightBg: colors.red.red2,

  // Font Sizes (in px)
  fontSizeXS: 12,
  fontSizeSM: 14,
  fontSize: 14,
  fontSizeLG: 16,
  fontSizeXL: 20,
  fontSizeXXL: 24,
  fontSizeXXXL: 30,
  
  // Font Weights
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemibold: 600,
  fontWeightBold: 700,
  
  // Line Heights
  lineHeightXS: 1.3,
  lineHeightSM: 1.4285,
  lineHeight: 1.5714,
  lineHeightLG: 1.625,
  lineHeightXL: 1.6666,
  lineHeightXXL: 1.7,
  
  // Heading Line Heights
  lineHeightHeading1: 1.2105,
  lineHeightHeading2: 1.2666,
  lineHeightHeading3: 1.3333,
  lineHeightHeading4: 1.4,
  lineHeightHeading5: 1.5,

  // Spacing (in px)
  marginXXS: 4,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  marginMD: 20,
  marginLG: 24,
  marginXL: 32,
  marginXXL: 48,
  
  paddingXXS: 4,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  paddingMD: 20,
  paddingLG: 24,
  paddingXL: 32,
  paddingXXL: 48,
  
  paddingContentHorizontalLG: 24,
  paddingContentHorizontal: 16,
  paddingContentHorizontalSM: 12,
  paddingContentVerticalLG: 16,
  paddingContentVertical: 12,
  paddingContentVerticalSM: 8,

  // Motion
  motionDurationFast: '100ms',
  motionDurationMid: '200ms',
  motionDurationSlow: '300ms',
  
  motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  motionEaseOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  motionEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
  motionEaseInBack: 'cubic-bezier(0.600, -0.280, 0.735, 0.045)',
  motionEaseOutBack: 'cubic-bezier(0.175, 0.885, 0.320, 1.275)',
  motionEaseInOutCirc: 'cubic-bezier(0.785, 0.135, 0.150, 0.860)',
  motionEaseOutCirc: 'cubic-bezier(0.075, 0.820, 0.165, 1.000)',

  // Border Radius (in px)
  borderRadiusXS: 2,
  borderRadiusSM: 4,
  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusXL: 12,
  borderRadiusOuter: 4,

  // Shadows
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  boxShadowPopover: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowCard: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  boxShadowDrawerRight: '-6px 0 16px 0 rgba(0, 0, 0, 0.08), -3px 0 6px -4px rgba(0, 0, 0, 0.12), -9px 0 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowDrawerLeft: '6px 0 16px 0 rgba(0, 0, 0, 0.08), 3px 0 6px -4px rgba(0, 0, 0, 0.12), 9px 0 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowDrawerUp: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowDrawerDown: '0 -6px 16px 0 rgba(0, 0, 0, 0.08), 0 -3px 6px -4px rgba(0, 0, 0, 0.12), 0 -9px 28px 8px rgba(0, 0, 0, 0.05)',
  boxShadowTabsOverflowLeft: 'inset 10px 0 8px -8px rgba(0, 0, 0, 0.08)',
  boxShadowTabsOverflowRight: 'inset -10px 0 8px -8px rgba(0, 0, 0, 0.08)',
  boxShadowTabsOverflowTop: 'inset 0 10px 8px -8px rgba(0, 0, 0, 0.08)',
  boxShadowTabsOverflowBottom: 'inset 0 -10px 8px -8px rgba(0, 0, 0, 0.08)',

  // Screen Breakpoints (in px)
  screenXS: 480,
  screenXSMin: 480,
  screenXSMax: 575,
  screenSM: 576,
  screenSMMin: 576,
  screenSMMax: 767,
  screenMD: 768,
  screenMDMin: 768,
  screenMDMax: 991,
  screenLG: 992,
  screenLGMin: 992,
  screenLGMax: 1199,
  screenXL: 1200,
  screenXLMin: 1200,
  screenXLMax: 1599,
  screenXXL: 1600,
  screenXXLMin: 1600,

  // Control
  controlHeightXS: 24,
  controlHeightSM: 32,
  controlHeight: 40,
  controlHeightLG: 48,
  
  controlOutline: 'rgba(5, 145, 255, 0.1)',
  controlOutlineWidth: 2,
  controlItemBgHover: colors.gray.gray3,
  controlItemBgActive: colors.blue.blue3,
  controlItemBgActiveHover: colors.blue.blue4,
  controlItemBgActiveDisabled: colors.gray.gray4,
  controlInteractiveSize: 16,
  
  controlPaddingHorizontal: 12,
  controlPaddingHorizontalSM: 8,

  // Z-Index
  zIndexBase: 0,
  zIndexPopupBase: 1000,
  zIndexDropdown: 1050,
  zIndexPicker: 1050,
  zIndexPopover: 1060,
  zIndexTooltip: 1070,
  zIndexFixedNav: 1080,
  zIndexModalMask: 1000,
  zIndexModal: 1000,
  zIndexNotification: 1010,
  zIndexMessage: 1010,
  zIndexPopconfirm: 1060,
  zIndexSpin: 1050,

  // Font Families
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  fontFamilyCode: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
  
  // Misc
  opacity: 1,
  opacityHover: 0.8,
  opacityDisabled: 0.4,
  opacityLoading: 0.65,

  // Wireframe
  wireframe: false,
};

// ============================================================================
// Dark Theme Tokens
// ============================================================================

export const darkTokens: GlobalToken = {
  ...lightTokens,
  
  // Override colors for dark theme
  text: colors.grayDark.gray12,
  textSecondary: colors.grayDark.gray11,
  textTertiary: colors.grayDark.gray9,
  textQuaternary: colors.grayDark.gray8,
  textDisabled: colors.grayDark.gray7,
  textPlaceholder: colors.grayDark.gray8,
  
  bg: '#0a0a0a',
  bgContainer: colors.grayDark.gray2,
  bgElevated: colors.grayDark.gray3,
  bgSpotlight: colors.grayDark.gray4,
  bgMask: 'rgba(0, 0, 0, 0.85)',
  
  border: colors.grayDark.gray6,
  borderSecondary: colors.grayDark.gray4,
  divider: colors.grayDark.gray5,
  
  // Adjust primary colors for dark theme
  primary: colors.blueDark.blue9,
  primaryHover: colors.blueDark.blue10,
  primaryActive: colors.blueDark.blue11,
  primaryBg: colors.blueDark.blue3,
  primaryBgHover: colors.blueDark.blue4,
  primaryBorder: colors.blueDark.blue6,
  primaryBorderHover: colors.blueDark.blue7,
  primaryText: colors.blueDark.blue11,
  primaryTextHover: colors.blueDark.blue12,
  primaryTextActive: colors.blueDark.blue12,
  
  // Adjust shadows for dark theme
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 1px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.15)',
  boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.3), 0 3px 6px -4px rgba(0, 0, 0, 0.4), 0 9px 28px 8px rgba(0, 0, 0, 0.2)',
  
  // Control colors for dark theme
  controlItemBgHover: colors.grayDark.gray4,
  controlItemBgActive: colors.blueDark.blue4,
  controlItemBgActiveHover: colors.blueDark.blue5,
  controlItemBgActiveDisabled: colors.grayDark.gray5,
};

// ============================================================================
// Component Token Interfaces
// ============================================================================

export interface ComponentToken {
  [key: string]: string | number | boolean;
}

export interface ButtonToken extends ComponentToken {
  contentFontSize: number;
  contentFontSizeLG: number;
  contentFontSizeSM: number;
  contentLineHeight: number;
  contentLineHeightLG: number;
  contentLineHeightSM: number;
  groupBorderColor: string;
  linkHoverBg: string;
  onlyIconSize: number;
  onlyIconSizeLG: number;
  onlyIconSizeSM: number;
  paddingBlock: number;
  paddingBlockLG: number;
  paddingBlockSM: number;
  paddingInline: number;
  paddingInlineLG: number;
  paddingInlineSM: number;
  primaryColor: string;
  primaryShadow: string;
  textHoverBg: string;
}

// ============================================================================
// Token Context & Hooks
// ============================================================================

import { createContext, useContext } from 'react';

export interface ThemeConfig {
  token: Partial<GlobalToken>;
  components?: {
    [key: string]: ComponentToken;
  };
  algorithm?: 'light' | 'dark' | ((token: GlobalToken) => GlobalToken);
}

export const ThemeContext = createContext<{
  theme: ThemeConfig;
  token: GlobalToken;
}>({
  theme: { token: {} },
  token: lightTokens,
});

export const useToken = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useToken must be used within a ThemeProvider');
  }
  return context.token;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

// ============================================================================
// Utility Functions
// ============================================================================

export const mergeToken = (base: GlobalToken, custom: Partial<GlobalToken>): GlobalToken => {
  return { ...base, ...custom };
};

export const getAlgorithmToken = (algorithm: 'light' | 'dark'): GlobalToken => {
  return algorithm === 'dark' ? darkTokens : lightTokens;
};

export const generateColorPalette = (baseColor: string) => {
  // Implementation for generating color palette from a base color
  // This would use color manipulation libraries to create shades
  return {
    1: baseColor,
    2: baseColor,
    3: baseColor,
    4: baseColor,
    5: baseColor,
    6: baseColor,
    7: baseColor,
    8: baseColor,
    9: baseColor,
    10: baseColor,
  };
};

// ============================================================================
// CSS Variable Generation
// ============================================================================

export const generateCSSVariables = (token: GlobalToken): string => {
  const cssVars: string[] = [];
  
  Object.entries(token).forEach(([key, value]) => {
    const cssVarName = `--katalyst-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    
    if (typeof value === 'string') {
      cssVars.push(`${cssVarName}: ${value};`);
    } else if (typeof value === 'number') {
      // Handle different types of numeric values
      if (key.includes('fontSize') || key.includes('Height') || key.includes('padding') || key.includes('margin') || key.includes('borderRadius')) {
        cssVars.push(`${cssVarName}: ${value}px;`);
      } else {
        cssVars.push(`${cssVarName}: ${value};`);
      }
    }
  });
  
  return `:root {\n  ${cssVars.join('\n  ')}\n}`;
};

export default {
  lightTokens,
  darkTokens,
  useToken,
  useTheme,
  mergeToken,
  getAlgorithmToken,
  generateColorPalette,
  generateCSSVariables,
};