'use client';

import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const subheadingVariants = cva('font-medium leading-relaxed', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
    variant: {
      default: 'text-muted-foreground',
      muted: 'text-muted-foreground/80',
      primary: 'text-foreground',
      secondary: 'text-secondary-foreground',
      // Web3/AI gradients
      'web3-gradient':
        'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 bg-clip-text text-transparent',
      'ai-gradient':
        'bg-gradient-to-r from-teal-500 via-green-500 to-emerald-500 bg-clip-text text-transparent',
      'enterprise-gradient':
        'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent',
      // Theme variations
      light: 'text-muted-foreground/70',
      dark: 'text-muted-foreground/90',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    spacing: {
      tight: 'leading-tight',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
    weight: 'normal',
    align: 'left',
    spacing: 'relaxed',
  },
});

export interface SubheadingProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof subheadingVariants> {
  as?: 'p' | 'span' | 'div';
  children: React.ReactNode;
  balanced?: boolean;
}

const Subheading = React.forwardRef<HTMLParagraphElement, SubheadingProps>(
  (
    {
      className,
      size,
      variant,
      weight,
      align,
      spacing,
      as: Component = 'p',
      balanced = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          subheadingVariants({ size, variant, weight, align, spacing }),
          balanced && 'text-balance',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Subheading.displayName = 'Subheading';

// Predefined subheading components for common use cases
export const HeroSubheading = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'size' | 'align'>
>(({ children, className, ...props }, ref) => (
  <Subheading
    ref={ref}
    size="xl"
    align="center"
    balanced
    className={cn('max-w-3xl mx-auto mb-8', className)}
    {...props}
  >
    {children}
  </Subheading>
));

HeroSubheading.displayName = 'HeroSubheading';

export const SectionSubheading = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'size' | 'align'>
>(({ children, className, ...props }, ref) => (
  <Subheading
    ref={ref}
    size="lg"
    align="center"
    balanced
    className={cn('max-w-2xl mx-auto mb-12', className)}
    {...props}
  >
    {children}
  </Subheading>
));

SectionSubheading.displayName = 'SectionSubheading';

export const CardSubheading = React.forwardRef<HTMLParagraphElement, Omit<SubheadingProps, 'size'>>(
  ({ children, className, ...props }, ref) => (
    <Subheading ref={ref} size="sm" variant="muted" className={cn('mb-4', className)} {...props}>
      {children}
    </Subheading>
  )
);

CardSubheading.displayName = 'CardSubheading';

export const FeatureSubheading = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'size' | 'variant'>
>(({ children, className, ...props }, ref) => (
  <Subheading
    ref={ref}
    size="sm"
    variant="muted"
    spacing="normal"
    className={cn('max-w-sm', className)}
    {...props}
  >
    {children}
  </Subheading>
));

FeatureSubheading.displayName = 'FeatureSubheading';

export const Web3Subheading = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'variant'>
>(({ children, className, ...props }, ref) => (
  <Subheading ref={ref} variant="web3-gradient" weight="medium" className={className} {...props}>
    {children}
  </Subheading>
));

Web3Subheading.displayName = 'Web3Subheading';

export const AISubheading = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'variant'>
>(({ children, className, ...props }, ref) => (
  <Subheading ref={ref} variant="ai-gradient" weight="medium" className={className} {...props}>
    {children}
  </Subheading>
));

AISubheading.displayName = 'AISubheading';

export const Quote = React.forwardRef<
  HTMLParagraphElement,
  Omit<SubheadingProps, 'as' | 'size' | 'variant'>
>(({ children, className, ...props }, ref) => (
  <Subheading
    ref={ref}
    as="blockquote"
    size="lg"
    variant="primary"
    weight="medium"
    spacing="relaxed"
    className={cn('border-l-4 border-primary pl-6 italic', className)}
    {...props}
  >
    {children}
  </Subheading>
));

Quote.displayName = 'Quote';

export { Subheading, subheadingVariants };
