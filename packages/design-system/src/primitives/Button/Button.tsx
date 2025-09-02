/**
 * Button Component - Enterprise-grade button with Radix UI primitives
 * 
 * Features:
 * - Multiple variants (primary, secondary, outline, ghost, link, text)
 * - Multiple sizes (xs, sm, default, lg, xl)
 * - Loading states with spinner
 * - Icon support (left/right positioning)
 * - Full keyboard navigation
 * - ARIA compliant
 * - Compound component pattern support
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { useToken } from '../../tokens';
import { Loader2 } from '@radix-ui/react-icons';

// ============================================================================
// Button Variants using CVA
// ============================================================================

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gradient: 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl',
        glow: 'relative bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.5)] hover:shadow-[0_0_30px_rgba(var(--primary),0.7)]',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded',
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-8 text-base rounded-md',
        xl: 'h-14 px-10 text-lg rounded-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-7 w-7',
      },
      fullWidth: {
        true: 'w-full',
      },
      loading: {
        true: 'relative cursor-wait',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
      loading: false,
    },
  }
);

// ============================================================================
// Button Types
// ============================================================================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  htmlType?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
  shape?: 'default' | 'circle' | 'round';
  danger?: boolean;
  block?: boolean;
  ghost?: boolean;
}

// ============================================================================
// Button Component
// ============================================================================

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      htmlType = 'button',
      href,
      target,
      rel,
      download,
      shape = 'default',
      danger = false,
      block = false,
      ghost = false,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const token = useToken();
    const Comp = asChild ? Slot : 'button';
    
    // Handle danger variant
    const actualVariant = danger ? 'destructive' : ghost ? 'ghost' : variant;
    
    // Handle block/fullWidth
    const isFullWidth = block || fullWidth;
    
    // Shape classes
    const shapeClasses = {
      default: '',
      circle: '!rounded-full aspect-square',
      round: '!rounded-full',
    };
    
    // Loading spinner
    const LoadingSpinner = () => (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    );
    
    // Button content
    const buttonContent = (
      <>
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        <span className={cn(loading && !loadingText && 'opacity-0')}>
          {loading && loadingText ? loadingText : children}
        </span>
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </>
    );
    
    // If href is provided, render as anchor
    if (href && !disabled) {
      return (
        <a
          href={href}
          target={target}
          rel={rel}
          download={download}
          className={cn(
            buttonVariants({ 
              variant: actualVariant, 
              size, 
              fullWidth: isFullWidth,
              loading,
              className 
            }),
            shapeClasses[shape],
            className
          )}
          onClick={onClick as any}
          {...(props as any)}
        >
          {buttonContent}
        </a>
      );
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ 
            variant: actualVariant, 
            size, 
            fullWidth: isFullWidth,
            loading,
            className 
          }),
          shapeClasses[shape],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        type={htmlType}
        onClick={onClick}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// Button Group Component
// ============================================================================

export interface ButtonGroupProps {
  children: React.ReactNode;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  vertical?: boolean;
  className?: string;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, size, variant, vertical = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          vertical ? 'flex-col' : 'flex-row',
          '[&>*:not(:first-child)]:rounded-l-none',
          '[&>*:not(:last-child)]:rounded-r-none',
          '[&>*:not(:first-child)]:border-l-0',
          vertical && '[&>*:not(:first-child)]:rounded-t-none',
          vertical && '[&>*:not(:last-child)]:rounded-b-none',
          vertical && '[&>*:not(:first-child)]:border-t-0',
          vertical && '[&>*:not(:first-child)]:border-l',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as any, {
              size: size || (child.props as any).size,
              variant: variant || (child.props as any).variant,
            });
          }
          return child;
        })}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

// ============================================================================
// Icon Button Component
// ============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'icon', className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size as any}
        className={cn('p-0', className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================================================
// Split Button Component
// ============================================================================

export interface SplitButtonProps extends ButtonProps {
  menu: React.ReactNode;
  menuTrigger?: React.ReactNode;
}

export const SplitButton = React.forwardRef<HTMLButtonElement, SplitButtonProps>(
  ({ children, menu, menuTrigger, className, ...props }, ref) => {
    return (
      <ButtonGroup className={className}>
        <Button ref={ref} {...props}>
          {children}
        </Button>
        <Button {...props} className="px-2">
          {menuTrigger || '▼'}
        </Button>
      </ButtonGroup>
    );
  }
);

SplitButton.displayName = 'SplitButton';

// ============================================================================
// Exports
// ============================================================================

export { Button, buttonVariants };
export default Button;