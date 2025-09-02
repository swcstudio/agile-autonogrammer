'use client';

import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const headingVariants = cva('font-semibold tracking-tight scroll-m-20', {
  variants: {
    size: {
      xs: 'text-sm',
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-xl',
      xl: 'text-2xl',
      '2xl': 'text-3xl',
      '3xl': 'text-4xl md:text-5xl',
      '4xl': 'text-5xl md:text-6xl',
      '5xl': 'text-6xl md:text-7xl',
      '6xl': 'text-7xl md:text-8xl',
    },
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      // Web3/AI gradients
      'web3-gradient':
        'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 bg-clip-text text-transparent',
      'ai-gradient':
        'bg-gradient-to-r from-teal-500 via-green-500 to-emerald-500 bg-clip-text text-transparent',
      'enterprise-gradient':
        'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent',
      'spectrum-gradient':
        'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    size: 'lg',
    variant: 'default',
    weight: 'semibold',
    align: 'left',
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, size, variant, weight, align, as: Component = 'h2', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(headingVariants({ size, variant, weight, align }), className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';

// Predefined heading components for common use cases
export const HeroHeading = React.forwardRef<
  HTMLHeadingElement,
  Omit<HeadingProps, 'as' | 'size' | 'variant'>
>(({ children, className, ...props }, ref) => (
  <Heading
    ref={ref}
    as="h1"
    size="6xl"
    variant="spectrum-gradient"
    weight="bold"
    align="center"
    className={cn('leading-tight', className)}
    {...props}
  >
    {children}
  </Heading>
));

HeroHeading.displayName = 'HeroHeading';

export const SectionHeading = React.forwardRef<
  HTMLHeadingElement,
  Omit<HeadingProps, 'as' | 'size'>
>(({ children, className, ...props }, ref) => (
  <Heading ref={ref} as="h2" size="4xl" align="center" className={cn('mb-4', className)} {...props}>
    {children}
  </Heading>
));

SectionHeading.displayName = 'SectionHeading';

export const SubsectionHeading = React.forwardRef<
  HTMLHeadingElement,
  Omit<HeadingProps, 'as' | 'size'>
>(({ children, className, ...props }, ref) => (
  <Heading ref={ref} as="h3" size="2xl" className={cn('mb-3', className)} {...props}>
    {children}
  </Heading>
));

SubsectionHeading.displayName = 'SubsectionHeading';

export const CardHeading = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'as' | 'size'>>(
  ({ children, className, ...props }, ref) => (
    <Heading ref={ref} as="h3" size="lg" className={cn('mb-2', className)} {...props}>
      {children}
    </Heading>
  )
);

CardHeading.displayName = 'CardHeading';

export const Web3Heading = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'variant'>>(
  ({ children, className, ...props }, ref) => (
    <Heading ref={ref} variant="web3-gradient" className={className} {...props}>
      {children}
    </Heading>
  )
);

Web3Heading.displayName = 'Web3Heading';

export const AIHeading = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'variant'>>(
  ({ children, className, ...props }, ref) => (
    <Heading ref={ref} variant="ai-gradient" className={className} {...props}>
      {children}
    </Heading>
  )
);

AIHeading.displayName = 'AIHeading';

export { Heading, headingVariants };
