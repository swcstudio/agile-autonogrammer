/**
 * StyleX Button Component
 *
 * Advanced button component using StyleX for atomic CSS generation
 * Demonstrates the power of StyleX with composable, type-safe styling
 */

import * as stylex from '@stylexjs/stylex';
import React from 'react';
import { componentTokens, tokens } from '../stylex-tokens';

// Button style definitions
const buttonStyles = stylex.create({
  // Base button styles
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.fontFamilyBase,
    fontWeight: tokens.fontWeightMedium,
    borderRadius: tokens.borderRadius,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    userSelect: 'none',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: `all ${tokens.transitionDurationNormal} ${tokens.transitionTimingEaseInOut}`,

    // Focus styles
    ':focus-visible': {
      outline: `2px solid ${tokens.colorFocus}`,
      outlineOffset: '2px',
    },

    // Disabled styles
    ':disabled': {
      opacity: tokens.opacity50,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },

    // Active/pressed state
    ':active': {
      transform: 'translateY(1px)',
    },
  },

  // Size variants
  sizeSm: {
    height: componentTokens.buttonHeightSm,
    paddingLeft: componentTokens.buttonPaddingXSm,
    paddingRight: componentTokens.buttonPaddingXSm,
    fontSize: tokens.fontSizeSm,
    gap: tokens.space2,
  },

  sizeMd: {
    height: componentTokens.buttonHeightMd,
    paddingLeft: componentTokens.buttonPaddingXMd,
    paddingRight: componentTokens.buttonPaddingXMd,
    fontSize: tokens.fontSizeBase,
    gap: tokens.space2,
  },

  sizeLg: {
    height: componentTokens.buttonHeightLg,
    paddingLeft: componentTokens.buttonPaddingXLg,
    paddingRight: componentTokens.buttonPaddingXLg,
    fontSize: tokens.fontSizeLg,
    gap: tokens.space3,
  },

  sizeXl: {
    height: componentTokens.buttonHeightXl,
    paddingLeft: componentTokens.buttonPaddingXXl,
    paddingRight: componentTokens.buttonPaddingXXl,
    fontSize: tokens.fontSizeXl,
    gap: tokens.space4,
  },

  // Variant styles
  primary: {
    backgroundColor: tokens.colorPrimary,
    color: tokens.colorPrimaryForeground,

    ':hover': {
      backgroundColor: tokens.colorPrimaryHover,
    },

    ':active': {
      backgroundColor: tokens.colorPrimaryActive,
    },
  },

  secondary: {
    backgroundColor: tokens.colorSecondary,
    color: tokens.colorSecondaryForeground,

    ':hover': {
      backgroundColor: tokens.colorSecondaryHover,
    },

    ':active': {
      backgroundColor: tokens.colorSecondaryActive,
    },
  },

  success: {
    backgroundColor: tokens.colorSuccess,
    color: tokens.colorSuccessForeground,

    ':hover': {
      backgroundColor: tokens.colorSuccessHover,
    },

    ':active': {
      backgroundColor: tokens.colorSuccessActive,
    },
  },

  warning: {
    backgroundColor: tokens.colorWarning,
    color: tokens.colorWarningForeground,

    ':hover': {
      backgroundColor: tokens.colorWarningHover,
    },

    ':active': {
      backgroundColor: tokens.colorWarningActive,
    },
  },

  error: {
    backgroundColor: tokens.colorError,
    color: tokens.colorErrorForeground,

    ':hover': {
      backgroundColor: tokens.colorErrorHover,
    },

    ':active': {
      backgroundColor: tokens.colorErrorActive,
    },
  },

  outline: {
    backgroundColor: 'transparent',
    color: tokens.colorPrimary,
    border: `${tokens.borderWidth} solid ${tokens.colorPrimary}`,

    ':hover': {
      backgroundColor: tokens.colorPrimary,
      color: tokens.colorPrimaryForeground,
    },
  },

  ghost: {
    backgroundColor: 'transparent',
    color: tokens.colorPrimary,

    ':hover': {
      backgroundColor: tokens.colorHover,
    },

    ':active': {
      backgroundColor: tokens.colorActive,
    },
  },

  link: {
    backgroundColor: 'transparent',
    color: tokens.colorPrimary,
    textDecoration: 'underline',
    height: 'auto',
    padding: 0,

    ':hover': {
      textDecoration: 'none',
      color: tokens.colorPrimaryHover,
    },
  },

  // Shape variants
  pill: {
    borderRadius: tokens.borderRadiusFull,
  },

  square: {
    borderRadius: 0,
  },

  rounded: {
    borderRadius: tokens.borderRadiusLg,
  },

  // Special variants
  gradient: {
    background: `linear-gradient(135deg, ${tokens.colorPrimary}, ${tokens.colorBrandSecondary})`,
    color: tokens.colorPrimaryForeground,

    ':hover': {
      background: `linear-gradient(135deg, ${tokens.colorPrimaryHover}, ${tokens.colorBrandSecondary})`,
    },
  },

  glassmorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: `${tokens.borderWidth} solid rgba(255, 255, 255, 0.2)`,
    color: tokens.colorForeground,

    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },

  neon: {
    backgroundColor: tokens.colorPrimary,
    color: tokens.colorPrimaryForeground,
    boxShadow: `0 0 20px ${tokens.colorPrimary}`,

    ':hover': {
      boxShadow: `0 0 30px ${tokens.colorPrimary}, 0 0 40px ${tokens.colorPrimary}`,
    },
  },

  // Loading state
  loading: {
    color: 'transparent',
    pointerEvents: 'none',
  },

  // Full width
  fullWidth: {
    width: '100%',
  },

  // Icon-only
  iconOnly: {
    paddingLeft: 0,
    paddingRight: 0,
    aspectRatio: '1',
  },
});

// Loading spinner styles
const spinnerStyles = stylex.create({
  spinner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '1em',
    height: '1em',
    border: `2px solid transparent`,
    borderTop: `2px solid currentColor`,
    borderRadius: tokens.borderRadiusFull,
    animation: `${tokens.animationDurationSpin} linear infinite spin`,
  },
});

// Ripple effect styles
const rippleStyles = stylex.create({
  rippleContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    borderRadius: 'inherit',
  },

  ripple: {
    position: 'absolute',
    borderRadius: tokens.borderRadiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: 'scale(0)',
    animation: `${tokens.transitionDurationSlow} ease-out ripple-expand`,
  },
});

// Component props interface
export interface StyleXButtonProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'gradient'
    | 'glassmorphism'
    | 'neon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'default' | 'pill' | 'square' | 'rounded';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  ripple?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  name?: string;
  value?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  style?: stylex.StyleXStyles;
  className?: string;
}

// Ripple hook for managing ripple effects
function useRipple(enabled: boolean) {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

  const addRipple = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!enabled) return;

      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { id, x, y }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 600);
    },
    [enabled]
  );

  return { ripples, addRipple };
}

// Main StyleX Button component
export function StyleXButton({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'default',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconOnly = false,
  ripple = false,
  startIcon,
  endIcon,
  onClick,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  type = 'button',
  form,
  name,
  value,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'data-testid': testId,
  style,
  className,
}: StyleXButtonProps) {
  const { ripples, addRipple } = useRipple(ripple);

  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple) {
      addRipple(event);
    }
    onMouseDown?.(event);
  };

  const buttonStyleX = stylex.props(
    buttonStyles.base,
    buttonStyles[size],
    buttonStyles[variant],
    shape !== 'default' && buttonStyles[shape],
    loading && buttonStyles.loading,
    fullWidth && buttonStyles.fullWidth,
    iconOnly && buttonStyles.iconOnly,
    style
  );

  return (
    <button
      {...buttonStyleX}
      className={className}
      type={type}
      form={form}
      name={name}
      value={value}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={onMouseUp}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      data-testid={testId}
    >
      {/* Start Icon */}
      {startIcon && !loading && <span>{startIcon}</span>}

      {/* Button Content */}
      <span style={{ visibility: loading ? 'hidden' : 'visible' }}>{children}</span>

      {/* End Icon */}
      {endIcon && !loading && <span>{endIcon}</span>}

      {/* Loading Spinner */}
      {loading && <span {...stylex.props(spinnerStyles.spinner)} />}

      {/* Ripple Effects */}
      {ripple && ripples.length > 0 && (
        <span {...stylex.props(rippleStyles.rippleContainer)}>
          {ripples.map(({ id, x, y }) => (
            <span
              key={id}
              {...stylex.props(rippleStyles.ripple)}
              style={{
                left: x - 10,
                top: y - 10,
                width: 20,
                height: 20,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}

// Button variants for convenience
export const PrimaryButton = (props: Omit<StyleXButtonProps, 'variant'>) => (
  <StyleXButton {...props} variant="primary" />
);

export const SecondaryButton = (props: Omit<StyleXButtonProps, 'variant'>) => (
  <StyleXButton {...props} variant="secondary" />
);

export const OutlineButton = (props: Omit<StyleXButtonProps, 'variant'>) => (
  <StyleXButton {...props} variant="outline" />
);

export const GhostButton = (props: Omit<StyleXButtonProps, 'variant'>) => (
  <StyleXButton {...props} variant="ghost" />
);

export const LinkButton = (props: Omit<StyleXButtonProps, 'variant'>) => (
  <StyleXButton {...props} variant="link" />
);

// Button group component
export interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  style?: stylex.StyleXStyles;
  className?: string;
}

const buttonGroupStyles = stylex.create({
  horizontal: {
    display: 'inline-flex',
    flexDirection: 'row',
  },

  vertical: {
    display: 'inline-flex',
    flexDirection: 'column',
  },

  spacingNone: {
    gap: 0,
  },

  spacingSm: {
    gap: tokens.space2,
  },

  spacingMd: {
    gap: tokens.space3,
  },

  spacingLg: {
    gap: tokens.space4,
  },

  // Connected buttons (no gap, shared borders)
  connected: {
    gap: 0,
  },

  connectedChild: {
    borderRadius: 0,
    ':first-child': {
      borderTopLeftRadius: tokens.borderRadius,
      borderBottomLeftRadius: tokens.borderRadius,
    },
    ':last-child': {
      borderTopRightRadius: tokens.borderRadius,
      borderBottomRightRadius: tokens.borderRadius,
    },
    ':not(:first-child)': {
      marginLeft: '-1px',
    },
  },
});

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  style,
  className,
}: ButtonGroupProps) {
  return (
    <div
      {...stylex.props(
        buttonGroupStyles[orientation],
        buttonGroupStyles[
          `spacing${spacing.charAt(0).toUpperCase() + spacing.slice(1)}` as keyof typeof buttonGroupStyles
        ],
        style
      )}
      className={className}
      role="group"
    >
      {children}
    </div>
  );
}

// Export button styles for external composition
export { buttonStyles };

// Example usage with different variants
export function ButtonShowcase() {
  return (
    <div
      {...stylex.props(
        stylex.create({
          container: {
            padding: tokens.space8,
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space6,
            maxWidth: '800px',
            margin: '0 auto',
          },
          section: {
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.space4,
          },
          row: {
            display: 'flex',
            gap: tokens.space4,
            flexWrap: 'wrap',
            alignItems: 'center',
          },
          title: {
            fontSize: tokens.fontSize2xl,
            fontWeight: tokens.fontWeightBold,
            color: tokens.colorForeground,
            marginBottom: tokens.space4,
          },
          subtitle: {
            fontSize: tokens.fontSizeLg,
            fontWeight: tokens.fontWeightSemibold,
            color: tokens.colorForegroundSecondary,
            marginBottom: tokens.space2,
          },
        }).container
      )}
    >
      <h1
        {...stylex.props(
          stylex.create({
            title: { fontSize: tokens.fontSize3xl, fontWeight: tokens.fontWeightBold },
          }).title
        )}
      >
        StyleX Button Showcase
      </h1>

      <div
        {...stylex.props(
          stylex.create({
            section: { display: 'flex', flexDirection: 'column', gap: tokens.space4 },
          }).section
        )}
      >
        <h2
          {...stylex.props(
            stylex.create({
              subtitle: { fontSize: tokens.fontSizeLg, fontWeight: tokens.fontWeightSemibold },
            }).subtitle
          )}
        >
          Variants
        </h2>
        <div
          {...stylex.props(
            stylex.create({ row: { display: 'flex', gap: tokens.space4, flexWrap: 'wrap' } }).row
          )}
        >
          <StyleXButton variant="primary">Primary</StyleXButton>
          <StyleXButton variant="secondary">Secondary</StyleXButton>
          <StyleXButton variant="success">Success</StyleXButton>
          <StyleXButton variant="warning">Warning</StyleXButton>
          <StyleXButton variant="error">Error</StyleXButton>
          <StyleXButton variant="outline">Outline</StyleXButton>
          <StyleXButton variant="ghost">Ghost</StyleXButton>
          <StyleXButton variant="link">Link</StyleXButton>
        </div>
      </div>

      <div
        {...stylex.props(
          stylex.create({
            section: { display: 'flex', flexDirection: 'column', gap: tokens.space4 },
          }).section
        )}
      >
        <h2
          {...stylex.props(
            stylex.create({
              subtitle: { fontSize: tokens.fontSizeLg, fontWeight: tokens.fontWeightSemibold },
            }).subtitle
          )}
        >
          Sizes
        </h2>
        <div
          {...stylex.props(
            stylex.create({
              row: { display: 'flex', gap: tokens.space4, flexWrap: 'wrap', alignItems: 'center' },
            }).row
          )}
        >
          <StyleXButton size="sm">Small</StyleXButton>
          <StyleXButton size="md">Medium</StyleXButton>
          <StyleXButton size="lg">Large</StyleXButton>
          <StyleXButton size="xl">Extra Large</StyleXButton>
        </div>
      </div>

      <div
        {...stylex.props(
          stylex.create({
            section: { display: 'flex', flexDirection: 'column', gap: tokens.space4 },
          }).section
        )}
      >
        <h2
          {...stylex.props(
            stylex.create({
              subtitle: { fontSize: tokens.fontSizeLg, fontWeight: tokens.fontWeightSemibold },
            }).subtitle
          )}
        >
          Special Effects
        </h2>
        <div
          {...stylex.props(
            stylex.create({ row: { display: 'flex', gap: tokens.space4, flexWrap: 'wrap' } }).row
          )}
        >
          <StyleXButton variant="gradient">Gradient</StyleXButton>
          <StyleXButton variant="glassmorphism">Glassmorphism</StyleXButton>
          <StyleXButton variant="neon">Neon</StyleXButton>
          <StyleXButton ripple>With Ripple</StyleXButton>
          <StyleXButton loading>Loading</StyleXButton>
        </div>
      </div>

      <div
        {...stylex.props(
          stylex.create({
            section: { display: 'flex', flexDirection: 'column', gap: tokens.space4 },
          }).section
        )}
      >
        <h2
          {...stylex.props(
            stylex.create({
              subtitle: { fontSize: tokens.fontSizeLg, fontWeight: tokens.fontWeightSemibold },
            }).subtitle
          )}
        >
          Button Group
        </h2>
        <ButtonGroup>
          <StyleXButton variant="outline">First</StyleXButton>
          <StyleXButton variant="outline">Second</StyleXButton>
          <StyleXButton variant="outline">Third</StyleXButton>
        </ButtonGroup>
      </div>
    </div>
  );
}
