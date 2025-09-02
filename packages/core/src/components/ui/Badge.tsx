/**
 * Katalyst Badge Component
 *
 * Universal badge component that works across all meta frameworks
 * Uses Katalyst Design System tokens and provides comprehensive accessibility
 */

import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { getComponentTokens } from '../../design-system/tokens';
import { cn, disabledState, focusRing, transition } from '../../utils/cn';

// Get badge-specific tokens from design system
const badgeTokens = getComponentTokens('badge');

const badgeVariants = cva(
  [
    // Base styles using Katalyst design tokens
    'inline-flex items-center gap-1.5 border font-medium',
    'transition-all duration-200',
    'focus:outline-none',
    focusRing(),
    // Use design system tokens
    'rounded-[var(--katalyst-component-badge-border-radius)]',
    'text-[var(--katalyst-component-badge-font-size)]',
    'leading-[var(--katalyst-component-badge-line-height)]',
    'font-[var(--katalyst-component-badge-font-weight)]',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-transparent',
          'bg-[var(--katalyst-color-primary)]',
          'text-[var(--katalyst-color-primary-foreground)]',
          'hover:bg-[var(--katalyst-color-primary-hover)]',
          'shadow-sm',
        ],

        secondary: [
          'border-transparent',
          'bg-[var(--katalyst-color-secondary)]',
          'text-[var(--katalyst-color-secondary-foreground)]',
          'hover:bg-[var(--katalyst-color-secondary-hover)]',
        ],

        destructive: [
          'border-transparent',
          'bg-[var(--katalyst-color-destructive)]',
          'text-[var(--katalyst-color-destructive-foreground)]',
          'hover:bg-[var(--katalyst-color-destructive-hover)]',
          'shadow-sm',
        ],

        outline: [
          'text-[var(--katalyst-color-text-primary)]',
          'border-[var(--katalyst-color-border)]',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
        ],

        // Web3 specific variants
        web3: [
          'border-transparent',
          'bg-gradient-to-r from-blue-500 to-purple-600',
          'text-white',
          'shadow-lg',
          'hover:from-blue-600 hover:to-purple-700',
          'hover:shadow-xl',
          'hover:scale-105',
        ],

        'web3-outline': [
          'border-2 border-blue-500',
          'text-blue-600 dark:text-blue-400',
          'bg-blue-50 dark:bg-blue-950/20',
          'hover:bg-blue-500',
          'hover:text-white',
          'hover:scale-105',
        ],

        // AI/ML specific variants
        ai: [
          'border-transparent',
          'bg-gradient-to-r from-teal-500 to-green-600',
          'text-white',
          'shadow-lg',
          'hover:from-teal-600 hover:to-green-700',
          'hover:shadow-xl',
          'hover:scale-105',
        ],

        'ai-outline': [
          'border-2 border-teal-500',
          'text-teal-600 dark:text-teal-400',
          'bg-teal-50 dark:bg-teal-950/20',
          'hover:bg-teal-500',
          'hover:text-white',
          'hover:scale-105',
        ],

        // Enterprise variants
        enterprise: [
          'border-transparent',
          'bg-slate-700',
          'text-white',
          'hover:bg-slate-800',
          'shadow-md',
        ],

        'enterprise-outline': [
          'border-2 border-slate-700',
          'text-slate-700 dark:text-slate-300',
          'bg-slate-50 dark:bg-slate-950/20',
          'hover:bg-slate-700',
          'hover:text-white',
        ],

        // Status variants
        success: [
          'border-transparent',
          'bg-[var(--katalyst-color-status-success)]',
          'text-white',
          'hover:bg-[var(--katalyst-color-status-success-hover)]',
          'shadow-sm',
        ],

        warning: [
          'border-transparent',
          'bg-[var(--katalyst-color-status-warning)]',
          'text-[var(--katalyst-color-status-warning-foreground)]',
          'hover:bg-[var(--katalyst-color-status-warning-hover)]',
          'shadow-sm',
        ],

        error: [
          'border-transparent',
          'bg-[var(--katalyst-color-status-error)]',
          'text-white',
          'hover:bg-[var(--katalyst-color-status-error-hover)]',
          'shadow-sm',
        ],

        info: [
          'border-transparent',
          'bg-[var(--katalyst-color-status-info)]',
          'text-white',
          'hover:bg-[var(--katalyst-color-status-info-hover)]',
          'shadow-sm',
        ],

        // Special effects
        glow: [
          'border-transparent',
          'bg-gradient-to-r from-blue-500 to-purple-600',
          'text-white',
          'shadow-lg',
          'hover:shadow-2xl hover:shadow-blue-500/25',
          'animate-glow',
        ],

        shimmer: [
          'border-transparent',
          'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500',
          'bg-[length:200%_100%]',
          'text-white',
          'animate-shimmer',
        ],
      },

      size: {
        sm: ['px-2 py-0.5 text-xs', 'gap-1'],
        default: ['px-2.5 py-0.5 text-xs', 'gap-1.5'],
        lg: ['px-3 py-1 text-sm', 'gap-2'],
        xl: ['px-4 py-1.5 text-base font-semibold', 'gap-2.5'],
      },

      rounded: {
        default: 'rounded-full',
        sm: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Whether to render as a child component
   */
  asChild?: boolean;

  /**
   * Enable animation effects
   */
  animated?: boolean;

  /**
   * Enable pulse animation
   */
  pulse?: boolean;

  /**
   * Icon to display on the left side
   */
  icon?: React.ReactNode;

  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;

  /**
   * Whether the badge is interactive (clickable)
   */
  interactive?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Custom loading spinner
   */
  loadingSpinner?: React.ReactNode;
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
 * Universal Badge component for Katalyst React framework
 *
 * Features:
 * - Full design system integration
 * - Multiple variants (default, secondary, status, special)
 * - Responsive sizing
 * - Icon support
 * - Animation options
 * - Loading states
 * - Framework-agnostic (works in Core, Next.js, Remix)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Badge>New</Badge>
 *
 * // With variants and icons
 * <Badge variant="success" icon="✅">
 *   Completed
 * </Badge>
 *
 * // Animated with special effects
 * <Badge variant="glow" animated>
 *   Premium
 * </Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      animated = false,
      pulse = false,
      icon,
      rightIcon,
      interactive = false,
      loading = false,
      loadingSpinner,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? React.Fragment : 'div';

    const content = (
      <>
        {loading ? (
          <span className="inline-flex items-center">
            {loadingSpinner || <DefaultSpinner className="h-3 w-3" />}
          </span>
        ) : (
          icon && <span className="inline-flex items-center">{icon}</span>
        )}
        {children}
        {rightIcon && !loading && <span className="inline-flex items-center">{rightIcon}</span>}
      </>
    );

    const badgeClasses = cn(
      badgeVariants({ variant, size, rounded }),
      pulse && 'animate-pulse',
      interactive && ['cursor-pointer', 'hover:scale-105', 'active:scale-95'],
      className
    );

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement;
      return React.cloneElement(child, {
        ref,
        className: cn(child.props.className, badgeClasses),
        ...props,
        children: content,
      });
    }

    if (animated) {
      // For animated badges, we'll prepare for future motion integration
      // Currently returns standard badge, but structure allows for easy motion addition
      return (
        <div
          ref={ref}
          className={badgeClasses}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          {...props}
        >
          {content}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={badgeClasses}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {content}
      </div>
    );
  }
);

Badge.displayName = 'KatalystBadge';

// Predefined badges for common use cases
export const Web3Badge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'>>(
  ({ children, ...props }, ref) => (
    <Badge ref={ref} variant="web3" icon="🌐" {...props}>
      {children}
    </Badge>
  )
);
Web3Badge.displayName = 'Web3Badge';

export const AIBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'>>(
  ({ children, ...props }, ref) => (
    <Badge ref={ref} variant="ai" icon="🤖" {...props}>
      {children}
    </Badge>
  )
);
AIBadge.displayName = 'AIBadge';

export const BlockchainBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'>>(
  ({ children, ...props }, ref) => (
    <Badge ref={ref} variant="web3-outline" icon="⛓️" {...props}>
      {children}
    </Badge>
  )
);
BlockchainBadge.displayName = 'BlockchainBadge';

export const EnterpriseBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'>>(
  ({ children, ...props }, ref) => (
    <Badge ref={ref} variant="enterprise" icon="🏢" {...props}>
      {children}
    </Badge>
  )
);
EnterpriseBadge.displayName = 'EnterpriseBadge';

export const StatusBadge = React.forwardRef<
  HTMLDivElement,
  Omit<BadgeProps, 'variant'> & {
    status: 'success' | 'warning' | 'error' | 'info';
  }
>(({ status, children, ...props }, ref) => {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  };

  return (
    <Badge ref={ref} variant={status} icon={icons[status]} {...props}>
      {children}
    </Badge>
  );
});
StatusBadge.displayName = 'StatusBadge';

// CSS animations for special effects
const animationStyles = `
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  .animate-glow {
    animation: glow 2s ease-in-out infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 3s ease-in-out infinite;
  }
`;

// Export animations for inclusion in global styles
export const badgeAnimations = animationStyles;

export { Badge, badgeVariants };
export type { BadgeProps };
