import { Button as AntButton, type ButtonProps as AntButtonProps } from 'antd';
import { type HTMLMotionProps, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { cn } from '../../utils';
import { useAnimations } from '../design-system-store';

export interface AnimatedButtonProps extends Omit<AntButtonProps, 'className'> {
  variant?: 'default' | 'glow' | 'shimmer' | 'gradient' | 'spotlight' | 'magnetic';
  animation?: 'bounce' | 'pulse' | 'scale' | 'rotate' | 'shake';
  glowColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
  motionProps?: HTMLMotionProps<'button'>;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'default',
  animation,
  glowColor = 'var(--katalyst-primary)',
  gradientFrom = 'var(--katalyst-primary)',
  gradientTo = 'var(--katalyst-secondary)',
  className,
  children,
  disabled,
  motionProps,
  ...antProps
}) => {
  const animationsEnabled = useAnimations();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Animation variants
  const animationVariants = {
    bounce: {
      y: [0, -10, 0],
      transition: { duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1 },
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 1, repeat: Number.POSITIVE_INFINITY },
    },
    scale: {
      scale: isHovered ? 1.05 : 1,
      transition: { type: 'spring', stiffness: 400, damping: 10 },
    },
    rotate: {
      rotate: isHovered ? 5 : 0,
      transition: { type: 'spring', stiffness: 400, damping: 10 },
    },
    shake: {
      x: isPressed ? [-2, 2, -2, 2, 0] : 0,
      transition: { duration: 0.3 },
    },
  };

  // Variant styles
  const variantClasses = {
    default: '',
    glow: cn(
      'relative overflow-hidden',
      'before:absolute before:inset-0 before:p-[2px] before:rounded-[inherit]',
      'before:bg-gradient-to-r before:from-transparent before:via-[var(--glow-color)] before:to-transparent',
      'before:animate-glow before:opacity-0 hover:before:opacity-100',
      'after:absolute after:inset-[2px] after:rounded-[inherit] after:bg-background'
    ),
    shimmer: cn(
      'relative overflow-hidden',
      'before:absolute before:inset-0',
      'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
      'before:translate-x-[-200%] hover:before:animate-shimmer'
    ),
    gradient: cn(
      'relative overflow-hidden bg-gradient-to-r',
      'transition-all duration-300',
      'hover:shadow-lg hover:shadow-[var(--gradient-from)]/25'
    ),
    spotlight: cn(
      'relative overflow-hidden',
      'before:absolute before:inset-0 before:opacity-0',
      'before:bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),_rgba(255,255,255,0.1)_0%,_transparent_50%)]',
      'hover:before:opacity-100 before:transition-opacity'
    ),
    magnetic: 'relative',
  };

  // Handle magnetic effect
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (variant !== 'magnetic' || !animationsEnabled) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (variant !== 'magnetic') return;
    e.currentTarget.style.transform = 'translate(0, 0)';
  };

  // Handle spotlight effect
  const handleSpotlightMove = (e: React.MouseEvent<HTMLElement>) => {
    if (variant !== 'spotlight' || !animationsEnabled) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    button.style.setProperty('--mouse-x', `${x}px`);
    button.style.setProperty('--mouse-y', `${y}px`);
  };

  // Combine all mouse handlers
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    setIsHovered(true);
    antProps.onMouseEnter?.(e as any);
  };

  const handleMouseLeaveAll = (e: React.MouseEvent<HTMLElement>) => {
    setIsHovered(false);
    handleMouseLeave(e);
    antProps.onMouseLeave?.(e as any);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    setIsPressed(true);
    antProps.onMouseDown?.(e as any);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    setIsPressed(false);
    antProps.onMouseUp?.(e as any);
  };

  // Build the button
  const buttonContent = (
    <AntButton
      {...antProps}
      disabled={disabled}
      className={cn(
        'katalyst-animated-button',
        variantClasses[variant],
        {
          'transition-all duration-300': animationsEnabled && variant !== 'magnetic',
          'transition-transform duration-150': variant === 'magnetic',
        },
        className
      )}
      style={{
        '--glow-color': glowColor,
        '--gradient-from': gradientFrom,
        '--gradient-to': gradientTo,
        background:
          variant === 'gradient'
            ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
            : undefined,
        ...antProps.style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeaveAll}
      onMouseMove={
        variant === 'spotlight'
          ? handleSpotlightMove
          : variant === 'magnetic'
            ? handleMouseMove
            : undefined
      }
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {variant === 'glow' && <span className="relative z-10">{children}</span>}
      {variant !== 'glow' && children}
    </AntButton>
  );

  // If animations are disabled or no animation specified, return the button directly
  if (!animationsEnabled || !animation) {
    return buttonContent;
  }

  // Wrap with motion for animations
  return (
    <motion.div className="inline-block" animate={animationVariants[animation]} {...motionProps}>
      {buttonContent}
    </motion.div>
  );
};

// Preset configurations for common use cases
export const AnimatedButtonPresets = {
  primary: { type: 'primary', variant: 'glow' } as AnimatedButtonProps,
  secondary: { type: 'default', variant: 'shimmer' } as AnimatedButtonProps,
  danger: {
    type: 'primary',
    danger: true,
    variant: 'pulse',
    animation: 'pulse',
  } as AnimatedButtonProps,
  success: {
    type: 'primary',
    variant: 'gradient',
    gradientFrom: '#10b981',
    gradientTo: '#34d399',
  } as AnimatedButtonProps,
  ghost: { type: 'ghost', variant: 'magnetic' } as AnimatedButtonProps,
  link: { type: 'link', animation: 'scale' } as AnimatedButtonProps,
};

// Mobile-optimized button
export const MobileAnimatedButton: React.FC<AnimatedButtonProps> = (props) => {
  return (
    <AnimatedButton
      {...props}
      size="large"
      block
      motionProps={{
        whileTap: { scale: 0.95 },
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }}
    />
  );
};
