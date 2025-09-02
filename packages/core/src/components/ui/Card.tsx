/**
 * Katalyst Card Component
 *
 * Universal card component that works across all meta frameworks
 * Uses Katalyst Design System tokens and provides comprehensive accessibility
 */

import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { getComponentTokens } from '../../design-system/tokens';
import { border, cn, shadow } from '../../utils/cn';

// Get card-specific tokens from design system
const cardTokens = getComponentTokens('card');

const cardVariants = cva(
  [
    // Base styles using Katalyst design tokens
    'block w-full transition-all duration-200',
    // Use design system tokens
    'bg-[var(--katalyst-component-card-background)]',
    'border-[var(--katalyst-component-card-border)]',
    'rounded-[var(--katalyst-component-card-border-radius)]',
    'shadow-[var(--katalyst-component-card-shadow)]',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--katalyst-color-background)]',
          'border border-[var(--katalyst-color-border)]',
          'text-[var(--katalyst-color-text-primary)]',
        ],

        elevated: [
          'bg-[var(--katalyst-color-background)]',
          'border-0',
          'shadow-lg hover:shadow-xl',
          'text-[var(--katalyst-color-text-primary)]',
        ],

        outline: [
          'bg-transparent',
          'border-2 border-[var(--katalyst-color-border)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
        ],

        ghost: [
          'bg-transparent',
          'border-0',
          'shadow-none',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-secondary)]',
        ],

        filled: [
          'bg-[var(--katalyst-color-background-secondary)]',
          'border-0',
          'shadow-sm',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:bg-[var(--katalyst-color-background-tertiary)]',
        ],

        gradient: [
          'bg-gradient-to-br from-[var(--katalyst-color-background)] to-[var(--katalyst-color-background-secondary)]',
          'border border-[var(--katalyst-color-border)]',
          'text-[var(--katalyst-color-text-primary)]',
          'hover:from-[var(--katalyst-color-background-secondary)] hover:to-[var(--katalyst-color-background-tertiary)]',
        ],

        // Status variants
        success: [
          'bg-[var(--katalyst-color-background)]',
          'border border-[var(--katalyst-color-border-success)]',
          'text-[var(--katalyst-color-text-primary)]',
          'shadow-sm shadow-green-500/10',
        ],

        warning: [
          'bg-[var(--katalyst-color-background)]',
          'border border-[var(--katalyst-color-border-warning)]',
          'text-[var(--katalyst-color-text-primary)]',
          'shadow-sm shadow-yellow-500/10',
        ],

        error: [
          'bg-[var(--katalyst-color-background)]',
          'border border-[var(--katalyst-color-border-error)]',
          'text-[var(--katalyst-color-text-primary)]',
          'shadow-sm shadow-red-500/10',
        ],
      },

      size: {
        sm: ['p-4', 'text-sm'],
        default: ['p-[var(--katalyst-component-card-padding)]'],
        lg: ['p-8', 'text-base'],
        xl: ['p-12', 'text-lg'],
      },

      interactive: {
        true: [
          'cursor-pointer',
          'hover:shadow-md',
          'hover:-translate-y-0.5',
          'active:scale-[0.99]',
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-[var(--katalyst-color-border-focus)]',
          'focus-visible:ring-offset-2',
        ],
        false: '',
      },

      loading: {
        true: ['animate-pulse', 'pointer-events-none'],
        false: '',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
      loading: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Render as a different element (e.g., article, section)
   */
  as?: React.ElementType;

  /**
   * Card title
   */
  title?: string;

  /**
   * Card subtitle or description
   */
  subtitle?: string;

  /**
   * Header content (overrides title/subtitle)
   */
  header?: React.ReactNode;

  /**
   * Footer content
   */
  footer?: React.ReactNode;

  /**
   * Action buttons or controls
   */
  actions?: React.ReactNode;

  /**
   * Icon to display in header
   */
  icon?: React.ReactNode;

  /**
   * Image to display at the top
   */
  image?: React.ReactNode;

  /**
   * Whether the card should have hover effects
   */
  hoverable?: boolean;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Header class name
   */
  headerClassName?: string;

  /**
   * Content class name
   */
  contentClassName?: string;

  /**
   * Footer class name
   */
  footerClassName?: string;
}

// Card subcomponents for composition
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5 pb-4 border-b border-[var(--katalyst-color-border)]',
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-[var(--katalyst-color-text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[var(--katalyst-color-text-secondary)]', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('pt-4', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center pt-4 mt-4 border-t border-[var(--katalyst-color-border)]',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Default loading component
const DefaultLoadingComponent: React.FC = () => (
  <div className="space-y-3">
    <div className="h-4 bg-[var(--katalyst-color-background-secondary)] rounded animate-pulse" />
    <div className="space-y-2">
      <div className="h-3 bg-[var(--katalyst-color-background-secondary)] rounded animate-pulse" />
      <div className="h-3 bg-[var(--katalyst-color-background-secondary)] rounded w-2/3 animate-pulse" />
    </div>
  </div>
);

/**
 * Universal Card component for Katalyst React framework
 *
 * Features:
 * - Full design system integration
 * - Comprehensive accessibility support
 * - Multiple variants (default, elevated, outline, ghost, etc.)
 * - Status variants (success, warning, error)
 * - Interactive states with hover effects
 * - Loading states with skeleton
 * - Composition with subcomponents
 * - Framework-agnostic (works in Core, Next.js, Remix)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Card>
 *   <CardContent>Basic card content</CardContent>
 * </Card>
 *
 * // With all features
 * <Card
 *   variant="elevated"
 *   size="lg"
 *   interactive
 *   title="Card Title"
 *   subtitle="Card description"
 *   icon={<Icon />}
 *   actions={<Button>Action</Button>}
 * >
 *   Card content goes here
 * </Card>
 *
 * // Composition pattern
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 *   <CardFooter>Footer</CardFooter>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      size,
      interactive,
      loading,
      as: Component = 'div',
      title,
      subtitle,
      header,
      footer,
      actions,
      icon,
      image,
      hoverable,
      loadingComponent,
      headerClassName,
      contentClassName,
      footerClassName,
      children,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // Determine if card should be interactive
    const isInteractive = interactive || hoverable || Boolean(onClick);

    // Handle keyboard navigation for interactive cards
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as any);
      }
      onKeyDown?.(event);
    };

    // Generate content based on props
    const cardHeader = React.useMemo(() => {
      if (header) return header;

      if (title || subtitle || icon) {
        return (
          <CardHeader className={headerClassName}>
            <div className="flex items-start gap-3">
              {icon && (
                <div className="text-[var(--katalyst-color-text-tertiary)] shrink-0">{icon}</div>
              )}
              <div className="flex-1 space-y-1">
                {title && <CardTitle>{title}</CardTitle>}
                {subtitle && <CardDescription>{subtitle}</CardDescription>}
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
          </CardHeader>
        );
      }

      return null;
    }, [header, title, subtitle, icon, actions, headerClassName]);

    const cardContent = React.useMemo(() => {
      if (loading) {
        return (
          <CardContent className={contentClassName}>
            {loadingComponent || <DefaultLoadingComponent />}
          </CardContent>
        );
      }

      if (children) {
        // If children already contains Card subcomponents, render as-is
        if (
          React.Children.toArray(children).some(
            (child) =>
              React.isValidElement(child) &&
              ['CardHeader', 'CardContent', 'CardFooter'].includes(child.type?.displayName || '')
          )
        ) {
          return children;
        }

        // Otherwise wrap in CardContent
        return <CardContent className={contentClassName}>{children}</CardContent>;
      }

      return null;
    }, [loading, loadingComponent, children, contentClassName]);

    const cardFooter = footer ? (
      <CardFooter className={footerClassName}>{footer}</CardFooter>
    ) : null;

    return (
      <Component
        ref={ref}
        className={cn(
          cardVariants({
            variant,
            size,
            interactive: isInteractive,
            loading,
          }),
          className
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive ? (tabIndex ?? 0) : tabIndex}
        role={role || (isInteractive ? 'button' : undefined)}
        aria-label={ariaLabel}
        {...props}
      >
        {image && (
          <div className="mb-4 -mt-[var(--katalyst-component-card-padding)] -mx-[var(--katalyst-component-card-padding)]">
            {image}
          </div>
        )}

        {cardHeader}
        {cardContent}
        {cardFooter}
      </Component>
    );
  }
);

Card.displayName = 'KatalystCard';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
export type { CardProps };
