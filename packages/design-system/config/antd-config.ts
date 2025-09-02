import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import { tokens } from './tokens';

/**
 * Katalyst Design System - Ant Design Pro Configuration
 * Maps Katalyst design tokens to Ant Design's theme system
 */

// Convert Katalyst tokens to Ant Design token format
const mapKatalystToAntd = (katalystTokens: typeof tokens, isDark: boolean) => {
  const colorTokens = katalystTokens.colors[isDark ? 'dark' : 'light'];

  return {
    // Brand Colors
    colorPrimary: katalystTokens.colors.brand.primary.DEFAULT,
    colorSuccess: katalystTokens.colors.brand.emerald.DEFAULT,
    colorWarning: katalystTokens.colors.brand.amber.DEFAULT,
    colorError: katalystTokens.colors.brand.red.DEFAULT,
    colorInfo: katalystTokens.colors.brand.blue.DEFAULT,

    // Background Colors
    colorBgContainer: colorTokens.background.primary,
    colorBgElevated: colorTokens.background.secondary,
    colorBgLayout: colorTokens.background.tertiary,
    colorBgSpotlight: colorTokens.background.accent,

    // Text Colors
    colorText: colorTokens.text.primary,
    colorTextSecondary: colorTokens.text.secondary,
    colorTextTertiary: colorTokens.text.tertiary,
    colorTextQuaternary: colorTokens.text.muted,

    // Border Colors
    colorBorder: colorTokens.border.primary,
    colorBorderSecondary: colorTokens.border.secondary,

    // Typography
    fontFamily: katalystTokens.typography.fontFamily.sans,
    fontFamilyCode: katalystTokens.typography.fontFamily.mono,
    fontSize: Number.parseInt(katalystTokens.typography.fontSize.base),

    // Spacing (convert rem to px)
    paddingXS: Number.parseInt(katalystTokens.spacing[1]) * 16,
    paddingSM: Number.parseInt(katalystTokens.spacing[2]) * 16,
    padding: Number.parseInt(katalystTokens.spacing[4]) * 16,
    paddingMD: Number.parseInt(katalystTokens.spacing[4]) * 16,
    paddingLG: Number.parseInt(katalystTokens.spacing[6]) * 16,
    paddingXL: Number.parseInt(katalystTokens.spacing[8]) * 16,

    marginXS: Number.parseInt(katalystTokens.spacing[1]) * 16,
    marginSM: Number.parseInt(katalystTokens.spacing[2]) * 16,
    margin: Number.parseInt(katalystTokens.spacing[4]) * 16,
    marginMD: Number.parseInt(katalystTokens.spacing[4]) * 16,
    marginLG: Number.parseInt(katalystTokens.spacing[6]) * 16,
    marginXL: Number.parseInt(katalystTokens.spacing[8]) * 16,

    // Border Radius
    borderRadius: Number.parseInt(katalystTokens.radius.md),
    borderRadiusXS: Number.parseInt(katalystTokens.radius.xs),
    borderRadiusSM: Number.parseInt(katalystTokens.radius.sm),
    borderRadiusLG: Number.parseInt(katalystTokens.radius.lg),

    // Shadows
    boxShadow: katalystTokens.shadows.sm,
    boxShadowSecondary: katalystTokens.shadows.md,

    // Animation
    motionDurationFast: katalystTokens.animation.duration[100],
    motionDurationMid: katalystTokens.animation.duration[200],
    motionDurationSlow: katalystTokens.animation.duration[300],
    motionEaseInOut: katalystTokens.animation.easing.inOut,
    motionEaseOut: katalystTokens.animation.easing.out,

    // Screens (for responsive design)
    screenXS: Number.parseInt(katalystTokens.screens.xs),
    screenSM: Number.parseInt(katalystTokens.screens.sm),
    screenMD: Number.parseInt(katalystTokens.screens.md),
    screenLG: Number.parseInt(katalystTokens.screens.lg),
    screenXL: Number.parseInt(katalystTokens.screens.xl),
    screenXXL: Number.parseInt(katalystTokens.screens['2xl']),
  };
};

// Create theme configurations
export const createAntdTheme = (isDark: boolean): ThemeConfig => ({
  algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: mapKatalystToAntd(tokens, isDark),
  components: {
    // Button customizations to match Aceternity UI
    Button: {
      primaryShadow: '0 0 0 2px rgba(var(--katalyst-primary-rgb), 0.2)',
      primaryColor: tokens.colors.brand.primary.DEFAULT,
      borderRadius: Number.parseInt(tokens.radius.md),
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 48,
      paddingContentHorizontal: 24,
      fontWeight: Number.parseInt(tokens.typography.fontWeight.medium),
    },

    // Card with Aceternity-style effects
    Card: {
      borderRadiusLG: Number.parseInt(tokens.radius.lg),
      boxShadowTertiary: tokens.shadows.xl,
      paddingLG: Number.parseInt(tokens.spacing[6]) * 16,
    },

    // Input with modern styling
    Input: {
      borderRadius: Number.parseInt(tokens.radius.md),
      controlHeight: 40,
      paddingInline: Number.parseInt(tokens.spacing[4]) * 16,
      activeBorderColor: tokens.colors.brand.primary.DEFAULT,
      hoverBorderColor: tokens.colors.brand.primary.light,
    },

    // Select with enhanced styling
    Select: {
      borderRadius: Number.parseInt(tokens.radius.md),
      controlHeight: 40,
      optionSelectedBg: `${tokens.colors.brand.primary.DEFAULT}20`,
    },

    // Table with modern design
    Table: {
      borderRadius: Number.parseInt(tokens.radius.lg),
      headerBg: isDark
        ? tokens.colors.dark.background.secondary
        : tokens.colors.light.background.secondary,
      rowHoverBg: isDark
        ? `${tokens.colors.dark.background.accent}50`
        : `${tokens.colors.light.background.accent}50`,
    },

    // Modal with blur backdrop
    Modal: {
      borderRadiusLG: Number.parseInt(tokens.radius.xl),
      boxShadow: tokens.shadows['2xl'],
    },

    // Menu with enhanced styling
    Menu: {
      borderRadiusLG: Number.parseInt(tokens.radius.md),
      itemSelectedBg: `${tokens.colors.brand.primary.DEFAULT}15`,
      itemHoverBg: `${tokens.colors.brand.primary.DEFAULT}10`,
    },

    // Form with consistent spacing
    Form: {
      labelFontSize: Number.parseInt(tokens.typography.fontSize.sm),
      verticalLabelPadding: `0 0 ${tokens.spacing[2]}`,
      itemMarginBottom: Number.parseInt(tokens.spacing[6]) * 16,
    },

    // Message & Notification with modern style
    Message: {
      borderRadiusLG: Number.parseInt(tokens.radius.md),
      contentPadding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    },

    Notification: {
      borderRadiusLG: Number.parseInt(tokens.radius.lg),
      width: 384,
    },

    // Drawer with mobile optimization
    Drawer: {
      footerPaddingBlock: Number.parseInt(tokens.spacing[4]) * 16,
      footerPaddingInline: Number.parseInt(tokens.spacing[6]) * 16,
    },

    // Progress with gradient support
    Progress: {
      defaultColor: `linear-gradient(90deg, ${tokens.colors.brand.primary.light}, ${tokens.colors.brand.primary.DEFAULT})`,
    },

    // Badge with modern design
    Badge: {
      dotSize: 8,
      textFontSize: Number.parseInt(tokens.typography.fontSize.xs),
      textFontWeight: Number.parseInt(tokens.typography.fontWeight.medium),
    },

    // Tag with rounded design
    Tag: {
      borderRadiusSM: Number.parseInt(tokens.radius.full),
      defaultBg: `${tokens.colors.brand.primary.DEFAULT}15`,
      defaultColor: tokens.colors.brand.primary.DEFAULT,
    },
  },
});

// Mobile-specific overrides
export const createMobileTheme = (baseTheme: ThemeConfig): ThemeConfig => ({
  ...baseTheme,
  token: {
    ...baseTheme.token,
    // Larger touch targets for mobile
    controlHeight: 44,
    controlHeightSM: 36,
    controlHeightLG: 52,

    // Adjusted spacing for mobile
    padding: Number.parseInt(tokens.spacing[3]) * 16,
    paddingSM: Number.parseInt(tokens.spacing[2]) * 16,
    paddingLG: Number.parseInt(tokens.spacing[4]) * 16,

    // Larger font for readability
    fontSize: Number.parseInt(tokens.typography.fontSize.base) + 1,
  },
  components: {
    ...baseTheme.components,
    // Mobile-optimized components
    Button: {
      ...baseTheme.components?.Button,
      controlHeight: 44,
      controlHeightLG: 52,
      borderRadius: Number.parseInt(tokens.radius.lg),
    },
    Input: {
      ...baseTheme.components?.Input,
      controlHeight: 44,
      fontSize: 16, // Prevents zoom on iOS
    },
    Select: {
      ...baseTheme.components?.Select,
      controlHeight: 44,
    },
  },
});

// Export theme presets
export const themes = {
  light: createAntdTheme(false),
  dark: createAntdTheme(true),
  lightMobile: createMobileTheme(createAntdTheme(false)),
  darkMobile: createMobileTheme(createAntdTheme(true)),
};

// Utility to get theme by name and platform
export const getTheme = (themeName: 'light' | 'dark', isMobile = false): ThemeConfig => {
  const key = `${themeName}${isMobile ? 'Mobile' : ''}` as keyof typeof themes;
  return themes[key];
};
