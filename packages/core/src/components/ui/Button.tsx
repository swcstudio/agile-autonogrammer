/**
 * Katalyst Button Component
 *
 * Universal button component that works across all meta frameworks
 * Uses Katalyst Design System tokens and provides comprehensive accessibility
 */

import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { getComponentTokens } from '../../design-system/tokens';
import { cn } from '../../utils/cn';

// Get button-specific tokens from design system
const buttonTokens = getComponentTokens('button');

const buttonVariants = cva(
  // Base styles using Katalyst design tokens
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'text-sm font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98] transform-gpu',
    // Use design system tokens
    'min-h-[var(--katalyst-component-button-min-height)]',
    'px-[var(--katalyst-component-button-padding-x)]',
    'py-[var(--katalyst-component-button-padding-y)]',
    'rounded-[var(--katalyst-component-button-border-radius)]',
    'text-[var(--katalyst-component-button-font-size)]',
    'font-[var(--katalyst-component-button-font-weight)]',
    'leading-[var(--katalyst-component-button-line-height)]',
  ],
  {
    variants: {
      variant: {
        // Primary variants using semantic tokens
        primary: [
          'bg-[var(--katalyst-color-interactive-primary)]',
          'text-[var(--katalyst-color-text-inverse)]',
          'shadow-md hover:shadow-lg',
          'hover:bg-[var(--katalyst-color-interactive-primary-hover)]',
          'active:bg-[var(--katalyst-color-interactive-primary-active)]',
          'disabled:bg-[var(--katalyst-color-interactive-primary-disabled)]',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
        ],

        // Secondary variants
        secondary: [
          'bg-[var(--katalyst-color-interactive-secondary)]',
          'text-[var(--katalyst-color-text-primary)]',
          'shadow-sm hover:shadow-md',
          'hover:bg-[var(--katalyst-color-interactive-secondary-hover)]',
          'active:bg-[var(--katalyst-color-interactive-secondary-active)]',
          'disabled:bg-[var(--katalyst-color-interactive-secondary-disabled)]',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
        ],

        // Destructive variant
        destructive: [
          'bg-[var(--katalyst-color-interactive-destructive)]',
          'text-[var(--katalyst-color-text-inverse)]',
          'shadow-md hover:shadow-lg',
          'hover:bg-[var(--katalyst-color-interactive-destructive-hover)]',
          'active:bg-[var(--katalyst-color-interactive-destructive-active)]',
          'disabled:bg-[var(--katalyst-color-interactive-destructive-disabled)]',
          'focus-visible:ring-[var(--katalyst-color-status-error)]',
        ],

        // Outline variant
        outline: [
          'border border-[var(--katalyst-color-border)]',
          'bg-[var(--katalyst-color-background)]',
          'text-[var(--katalyst-color-text-primary)]',
          'shadow-sm hover:shadow-md',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
          'hover:border-[var(--katalyst-color-border-focus)]',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
        ],

        // Ghost variant
        ghost: [
          'bg-transparent',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
        ],

        // Link variant
        link: [
          'bg-transparent p-0 h-auto',
          'text-[var(--katalyst-color-text-link)]',
          'underline-offset-4 hover:underline',
          'hover:text-[var(--katalyst-color-text-link-hover)]',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
        ],

        // Web3 gradient variants
        web3: [
          'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600',
          'text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25',
          'hover:from-blue-600 hover:via-purple-600 hover:to-blue-700',
          'transform hover:-translate-y-0.5 transition-all duration-300',
          'focus-visible:ring-blue-400',
        ],

        'web3-outline': [
          'border-2 border-blue-500 bg-transparent',
          'text-blue-600 dark:text-blue-400',
          'shadow-md hover:shadow-lg hover:shadow-blue-500/25',
          'hover:bg-blue-500 hover:text-white',
          'transform hover:-translate-y-0.5 transition-all duration-300',
          'focus-visible:ring-blue-400',
        ],

        // AI/ML gradient variants
        ai: [
          'bg-gradient-to-r from-teal-500 via-green-500 to-teal-600',
          'text-white shadow-lg hover:shadow-xl hover:shadow-teal-500/25',
          'hover:from-teal-600 hover:via-green-600 hover:to-teal-700',
          'transform hover:-translate-y-0.5 transition-all duration-300',
          'focus-visible:ring-teal-400',
        ],

        'ai-outline': [
          'border-2 border-teal-500 bg-transparent',
          'text-teal-600 dark:text-teal-400',
          'shadow-md hover:shadow-lg hover:shadow-teal-500/25',
          'hover:bg-teal-500 hover:text-white',
          'transform hover:-translate-y-0.5 transition-all duration-300',
          'focus-visible:ring-teal-400',
        ],

        // Enterprise variants
        enterprise: [
          'bg-gradient-to-r from-slate-700 to-slate-800',
          'text-white shadow-lg hover:shadow-xl',
          'hover:from-slate-800 hover:to-slate-900',
          'focus-visible:ring-slate-400',
        ],

        'enterprise-outline': [
          'border-2 border-slate-700 bg-transparent',
          'text-slate-700 dark:text-slate-300',
          'hover:bg-slate-700 hover:text-white',
          'focus-visible:ring-slate-400',
        ],
      },

      size: {
        sm: ['h-8 px-3 text-xs', 'min-h-[2rem]'],
        default: ['h-10 px-4 py-2', 'min-h-[2.5rem]'],
        lg: ['h-11 px-8 text-base', 'min-h-[2.75rem]'],
        xl: ['h-12 px-10 text-lg font-semibold', 'min-h-[3rem]'],
        icon: ['h-10 w-10 p-0', 'min-h-[2.5rem] min-w-[2.5rem]'],
        'icon-sm': ['h-8 w-8 p-0', 'min-h-[2rem] min-w-[2rem]'],
        'icon-lg': ['h-12 w-12 p-0', 'min-h-[3rem] min-w-[3rem]'],
      },

      loading: {
        true: 'cursor-not-allowed',
        false: '',
      },

      // Animation variants
      animation: {
        none: '',
        subtle: 'hover:scale-[1.02] active:scale-[0.98]',
        bounce: 'hover:animate-pulse active:animate-bounce',
        glow: 'hover:shadow-2xl hover:shadow-current/20',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'default',
      loading: false,
      animation: 'subtle',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as a different element using Radix Slot
   */
  asChild?: boolean;

  /**
   * Loading state with spinner
   */
  loading?: boolean;

  /**
   * Custom loading text
   */
  loadingText?: string;

  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;

  /**
   * Custom loading spinner component
   */
  loadingSpinner?: React.ReactNode;

  /**
   * Accessibility label for screen readers
   */
  'aria-label'?: string;

  /**
   * Tooltip text
   */
  tooltip?: string;
}

// Default loading spinner component
const DefaultSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Universal Button component for Katalyst React framework
 *
 * Features:
 * - Full design system integration
 * - Comprehensive accessibility support
 * - Loading states with custom spinners
 * - Icon support (left/right)
 * - Multiple variants (primary, secondary, destructive, etc.)
 * - Web3, AI, and Enterprise themed variants
 * - Responsive sizing
 * - Animation variants
 * - Framework-agnostic (works in Core, Next.js, Remix)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button>Click me</Button>
 *
 * // With icons and loading
 * <Button
 *   variant="ai"
 *   size="lg"
 *   loading={isLoading}
 *   leftIcon={<AiIcon />}
 *   loadingText="Processing..."
 * >
 *   Generate AI Response
 * </Button>
 *
 * // As a link
 * <Button asChild variant="link">
 *   <Link href="/about">Learn More</Link>
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      animation,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      loadingSpinner,
      children,
      disabled,
      'aria-label': ariaLabel,
      tooltip,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // Generate unique ID for accessibility if needed
    const buttonId = React.useId();

    const buttonContent = React.useMemo(() => {
      if (loading) {
        const spinner = loadingSpinner || <DefaultSpinner className="h-4 w-4" />;
        return (
          <>
            {spinner}
            <span className="sr-only">Loading</span>
            {loadingText || 'Loading...'}
          </>
        );
      }

      return (
        <>
          {leftIcon && (
            <span className="inline-flex items-center shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {children}
          {rightIcon && (
            <span className="inline-flex items-center shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      );
    }, [loading, loadingSpinner, loadingText, leftIcon, rightIcon, children]);

    return (
      <Comp
        ref={ref}
        id={buttonId}
        className={cn(buttonVariants({ variant, size, loading, animation }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        title={tooltip}
        // Ensure proper focus behavior
        tabIndex={isDisabled ? -1 : 0}
        // Prevent form submission when loading
        {...(loading && { type: 'button' })}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);

Button.displayName = 'KatalystButton';

export { Button, buttonVariants };
export type { ButtonProps };
