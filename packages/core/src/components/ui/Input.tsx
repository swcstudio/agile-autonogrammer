/**
 * Katalyst Input Component
 *
 * Universal input component that works across all meta frameworks
 * Uses Katalyst Design System tokens and provides comprehensive accessibility
 */

import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { getComponentTokens } from '../../design-system/tokens';
import { cn, disabledState, focusRing, transition } from '../../utils/cn';

// Get input-specific tokens from design system
const inputTokens = getComponentTokens('input');

const inputVariants = cva(
  [
    // Base styles using Katalyst design tokens
    'flex w-full border transition-all duration-200',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-[var(--katalyst-color-text-tertiary)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    // Use design system tokens
    'min-h-[var(--katalyst-component-input-min-height)]',
    'px-[var(--katalyst-component-input-padding-x)]',
    'py-[var(--katalyst-component-input-padding-y)]',
    'rounded-[var(--katalyst-component-input-border-radius)]',
    'text-[var(--katalyst-component-input-font-size)]',
    'leading-[var(--katalyst-component-input-line-height)]',
    // Focus and interaction styles
    focusRing(),
    disabledState(),
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--katalyst-color-background)]',
          'border-[var(--katalyst-color-border)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:border-[var(--katalyst-color-border-focus)]',
          'focus:border-[var(--katalyst-color-border-focus)]',
        ],

        filled: [
          'bg-[var(--katalyst-color-background-secondary)]',
          'border-transparent',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-tertiary)]',
          'focus:bg-[var(--katalyst-color-background)]',
          'focus:border-[var(--katalyst-color-border-focus)]',
        ],

        ghost: [
          'bg-transparent',
          'border-transparent',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
          'focus:bg-[var(--katalyst-color-background)]',
          'focus:border-[var(--katalyst-color-border-focus)]',
        ],

        success: [
          'bg-[var(--katalyst-color-background)]',
          'border-[var(--katalyst-color-border-success)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:border-[var(--katalyst-color-status-success)]',
          'focus:border-[var(--katalyst-color-status-success)]',
          'focus:ring-[var(--katalyst-color-status-success)]',
        ],

        warning: [
          'bg-[var(--katalyst-color-background)]',
          'border-[var(--katalyst-color-border-warning)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:border-[var(--katalyst-color-status-warning)]',
          'focus:border-[var(--katalyst-color-status-warning)]',
          'focus:ring-[var(--katalyst-color-status-warning)]',
        ],

        error: [
          'bg-[var(--katalyst-color-background)]',
          'border-[var(--katalyst-color-border-error)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:border-[var(--katalyst-color-status-error)]',
          'focus:border-[var(--katalyst-color-status-error)]',
          'focus:ring-[var(--katalyst-color-status-error)]',
        ],
      },

      size: {
        sm: ['h-8 px-2 text-xs', 'min-h-[2rem]'],
        default: ['h-10 px-3 text-sm', 'min-h-[2.5rem]'],
        lg: ['h-11 px-4 text-base', 'min-h-[2.75rem]'],
        xl: ['h-12 px-5 text-lg', 'min-h-[3rem]'],
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label for the input (used for accessibility)
   */
  label?: string;

  /**
   * Help text displayed below the input
   */
  helpText?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Success message to display
   */
  success?: string;

  /**
   * Warning message to display
   */
  warning?: string;

  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;

  /**
   * Content to display on the left side (like prefixes)
   */
  leftAddon?: React.ReactNode;

  /**
   * Content to display on the right side (like suffixes)
   */
  rightAddon?: React.ReactNode;

  /**
   * Whether the input is loading
   */
  loading?: boolean;

  /**
   * Custom loading spinner
   */
  loadingSpinner?: React.ReactNode;

  /**
   * Container class name
   */
  containerClassName?: string;

  /**
   * Label class name
   */
  labelClassName?: string;

  /**
   * Helper text class name
   */
  helperClassName?: string;
}

// Default loading spinner
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
 * Universal Input component for Katalyst React framework
 *
 * Features:
 * - Full design system integration
 * - Comprehensive accessibility support
 * - Multiple variants (default, filled, ghost, etc.)
 * - Status variants (success, warning, error)
 * - Icon and addon support
 * - Loading states
 * - Responsive sizing
 * - Built-in validation feedback
 * - Framework-agnostic (works in Core, Next.js, Remix)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Input placeholder="Enter your name" />
 *
 * // With label and validation
 * <Input
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   error={errors.email}
 *   required
 * />
 *
 * // With icons and addons
 * <Input
 *   label="Amount"
 *   leftAddon="$"
 *   rightIcon={<DollarIcon />}
 *   placeholder="0.00"
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = 'text',
      label,
      helpText,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      loading = false,
      loadingSpinner,
      containerClassName,
      labelClassName,
      helperClassName,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const inputId = id || React.useId();
    const helpTextId = `${inputId}-help`;
    const errorId = `${inputId}-error`;
    const successId = `${inputId}-success`;
    const warningId = `${inputId}-warning`;

    // Determine current state
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;
    const hasWarning = Boolean(warning) && !hasError && !hasSuccess;

    // Determine variant based on state
    const currentVariant = hasError
      ? 'error'
      : hasSuccess
        ? 'success'
        : hasWarning
          ? 'warning'
          : variant;

    // Build aria-describedby
    const describedBy = React.useMemo(() => {
      const ids = [ariaDescribedBy];

      if (helpText) ids.push(helpTextId);
      if (error) ids.push(errorId);
      if (success) ids.push(successId);
      if (warning) ids.push(warningId);

      return ids.filter(Boolean).join(' ') || undefined;
    }, [
      ariaDescribedBy,
      helpText,
      error,
      success,
      warning,
      helpTextId,
      errorId,
      successId,
      warningId,
    ]);

    // Input element
    const inputElement = (
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={cn(
          inputVariants({ variant: currentVariant, size }),
          // Add padding for icons/addons
          leftIcon || leftAddon ? 'pl-10' : '',
          rightIcon || rightAddon || loading ? 'pr-10' : '',
          className
        )}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        disabled={props.disabled || loading}
        {...props}
      />
    );

    // Wrapper with icons/addons
    const inputWithAddons = (
      <div className="relative">
        {/* Left addon/icon */}
        {(leftAddon || leftIcon) && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            {leftAddon && (
              <span className="text-[var(--katalyst-color-text-secondary)] text-sm">
                {leftAddon}
              </span>
            )}
            {leftIcon && (
              <span className="text-[var(--katalyst-color-text-tertiary)] h-4 w-4 flex items-center justify-center">
                {leftIcon}
              </span>
            )}
          </div>
        )}

        {inputElement}

        {/* Right addon/icon/loading */}
        {(rightAddon || rightIcon || loading) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {loading && (
              <span className="text-[var(--katalyst-color-text-tertiary)] h-4 w-4 flex items-center justify-center">
                {loadingSpinner || <DefaultSpinner className="h-4 w-4" />}
              </span>
            )}
            {!loading && rightAddon && (
              <span className="text-[var(--katalyst-color-text-secondary)] text-sm">
                {rightAddon}
              </span>
            )}
            {!loading && rightIcon && (
              <span className="text-[var(--katalyst-color-text-tertiary)] h-4 w-4 flex items-center justify-center">
                {rightIcon}
              </span>
            )}
          </div>
        )}
      </div>
    );

    // If no label or helper text, return just the input
    if (!label && !helpText && !error && !success && !warning) {
      return inputWithAddons;
    }

    // Full input with label and helper text
    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-[var(--katalyst-color-text-primary)]',
              props.required && "after:content-['*'] after:ml-0.5 after:text-red-500",
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        {inputWithAddons}

        {/* Helper text and validation messages */}
        <div className="space-y-1">
          {helpText && (
            <p
              id={helpTextId}
              className={cn('text-xs text-[var(--katalyst-color-text-secondary)]', helperClassName)}
            >
              {helpText}
            </p>
          )}

          {error && (
            <p
              id={errorId}
              className="text-xs text-[var(--katalyst-color-status-error)] flex items-center gap-1"
              role="alert"
              aria-live="polite"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {success && (
            <p
              id={successId}
              className="text-xs text-[var(--katalyst-color-status-success)] flex items-center gap-1"
              role="status"
              aria-live="polite"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.06a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              {success}
            </p>
          )}

          {warning && (
            <p
              id={warningId}
              className="text-xs text-[var(--katalyst-color-status-warning)] flex items-center gap-1"
              role="status"
              aria-live="polite"
            >
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              {warning}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'KatalystInput';

export { Input, inputVariants };
export type { InputProps };
