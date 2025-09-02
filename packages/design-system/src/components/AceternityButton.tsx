/**
 * Aceternity-Enhanced Button Component
 *
 * Advanced button with Aceternity UI's signature animations and effects
 * while maintaining Ant Design compatibility
 */

import { Button as AntButton, type ButtonProps as AntButtonProps } from 'antd';
import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import type React from 'react';
import { type MouseEvent, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { useAnimations, useIsMobile } from '../design-system-store';

export interface AceternityButtonProps extends Omit<AntButtonProps, 'className'> {
  variant?:
    | 'default'
    | 'shimmer'
    | 'glow'
    | 'spotlight'
    | 'magnetic'
    | 'border-magic'
    | 'liquid'
    | 'aurora';
  animation?: 'bounce' | 'pulse' | 'scale' | 'rotate' | 'shake' | 'morph';
  gradient?: {
    from: string;
    via?: string;
    to: string;
    angle?: number;
  };
  glowConfig?: {
    color: string;
    size: number;
    intensity: number;
  };
  borderAnimation?: 'rotate' | 'pulse' | 'flow';
  ripple?: boolean;
  particles?: boolean;
  className?: string;
  containerClassName?: string;
  motionProps?: HTMLMotionProps<'button'>;
}

// Ripple effect component
const RippleEffect: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 4, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div
        className="w-10 h-10 rounded-full"
        style={{
          background: color,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </motion.div>
  );
};

// Particle effect component
const ParticleEffect: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const particles = Array.from({ length: 6 });

  return (
    <>
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-current rounded-full pointer-events-none"
          style={{ left: x, top: y }}
          initial={{ scale: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1, 0],
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
          }}
          transition={{
            duration: 0.6,
            ease: 'easeOut',
            delay: i * 0.05,
          }}
        />
      ))}
    </>
  );
};

// Shimmer overlay component
const ShimmerOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 -top-[2px] -left-[2px] -right-[2px] -bottom-[2px] rounded-[inherit] overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  );
};

// Border magic animation
const BorderMagic: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
      <div className="absolute inset-0 rounded-[inherit] p-[2px]">
        <div
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${color}, transparent 30%)`,
            animation: 'border-spin 3s linear infinite',
          }}
        />
      </div>
      <div className="absolute inset-[2px] rounded-[inherit] bg-background" />
    </div>
  );
};

export const AceternityButton: React.FC<AceternityButtonProps> = ({
  variant = 'default',
  animation,
  gradient,
  glowConfig = { color: '#3b82f6', size: 40, intensity: 0.5 },
  borderAnimation,
  ripple = true,
  particles = false,
  className,
  containerClassName,
  children,
  disabled,
  motionProps,
  style,
  ...antProps
}) => {
  const animationsEnabled = useAnimations();
  const isMobile = useIsMobile();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [particleEffects, setParticleEffects] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);

  // Motion values for magnetic effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  // Handle click with ripple/particle effects
  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (!buttonRef.current || !animationsEnabled) {
      antProps.onClick?.(e as any);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add ripple effect
    if (ripple) {
      const id = Date.now();
      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    // Add particle effect
    if (particles) {
      const id = Date.now();
      setParticleEffects((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setParticleEffects((prev) => prev.filter((p) => p.id !== id));
      }, 600);
    }

    antProps.onClick?.(e as any);
  };

  // Handle magnetic effect
  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (variant !== 'magnetic' || !animationsEnabled || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    mouseX.set(x * 0.1);
    mouseY.set(y * 0.1);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (variant === 'magnetic') {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  // Animation variants
  const buttonVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: animation === 'scale' ? 1.05 : 1,
      rotate: animation === 'rotate' ? 5 : 0,
    },
    tap: {
      scale: 0.95,
    },
    bounce: {
      y: [0, -10, 0],
      transition: { repeat: Number.POSITIVE_INFINITY, duration: 1 },
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { repeat: Number.POSITIVE_INFINITY, duration: 1.5 },
    },
    shake: {
      x: isPressed ? [-2, 2, -2, 2, 0] : 0,
      transition: { duration: 0.3 },
    },
  };

  // Build gradient style
  const gradientStyle = gradient
    ? {
        background: `linear-gradient(${gradient.angle || 135}deg, ${gradient.from}, ${gradient.via || gradient.to}, ${gradient.to})`,
        color: 'white',
        border: 'none',
      }
    : {};

  // Build glow style
  const glowStyle =
    variant === 'glow' && isHovered
      ? {
          boxShadow: `0 0 ${glowConfig.size}px ${glowConfig.color}${Math.round(
            glowConfig.intensity * 255
          )
            .toString(16)
            .padStart(2, '0')}`,
        }
      : {};

  // Variant-specific classes
  const variantClasses = {
    default: '',
    shimmer: 'relative overflow-hidden',
    glow: 'transition-shadow duration-300',
    spotlight: 'relative overflow-hidden',
    magnetic: 'relative',
    'border-magic': 'relative',
    liquid: 'relative overflow-hidden',
    aurora: 'relative overflow-hidden bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500',
  };

  // Build button content
  const buttonContent = (
    <AntButton
      ref={buttonRef as any}
      {...antProps}
      disabled={disabled}
      className={cn(
        'katalyst-aceternity-button',
        'relative z-10 transition-all duration-300',
        variantClasses[variant],
        {
          'hover:shadow-lg': animationsEnabled && !disabled,
          'transform-gpu': animationsEnabled,
        },
        className
      )}
      style={{
        ...gradientStyle,
        ...glowStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        antProps.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        handleMouseLeave();
        antProps.onMouseLeave?.(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => {
        setIsPressed(true);
        antProps.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setIsPressed(false);
        antProps.onMouseUp?.(e);
      }}
      onClick={handleClick}
    >
      {/* Shimmer effect */}
      {variant === 'shimmer' && animationsEnabled && <ShimmerOverlay />}

      {/* Border magic effect */}
      {variant === 'border-magic' && animationsEnabled && (
        <BorderMagic color={gradient?.from || glowConfig.color} />
      )}

      {/* Spotlight effect */}
      {variant === 'spotlight' && animationsEnabled && (
        <motion.div
          className="absolute inset-0 opacity-0"
          animate={{ opacity: isHovered ? 1 : 0 }}
          style={{
            background:
              'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent 40%)',
          }}
        />
      )}

      {/* Liquid effect */}
      {variant === 'liquid' && animationsEnabled && (
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          animate={{
            background: isHovered
              ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), transparent 70%)'
              : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0), transparent 70%)',
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Aurora effect */}
      {variant === 'aurora' && animationsEnabled && (
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12"
            style={{
              animation: 'shimmer 3s infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <RippleEffect
            key={ripple.id}
            x={ripple.x}
            y={ripple.y}
            color={gradient?.from || glowConfig.color}
          />
        ))}
      </AnimatePresence>

      {/* Particle effects */}
      <AnimatePresence>
        {particleEffects.map((particle) => (
          <ParticleEffect key={particle.id} x={particle.x} y={particle.y} />
        ))}
      </AnimatePresence>

      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </AntButton>
  );

  // Wrap with motion for animations
  if (animationsEnabled && (animation || variant === 'magnetic')) {
    return (
      <motion.div
        className={cn('inline-block', containerClassName)}
        variants={buttonVariants}
        initial="initial"
        animate={
          animation === 'bounce'
            ? 'bounce'
            : animation === 'pulse'
              ? 'pulse'
              : animation === 'shake'
                ? 'shake'
                : 'initial'
        }
        whileHover="hover"
        whileTap="tap"
        style={variant === 'magnetic' ? { x: springX, y: springY } : undefined}
        {...motionProps}
      >
        {buttonContent}
      </motion.div>
    );
  }

  return <div className={cn('inline-block', containerClassName)}>{buttonContent}</div>;
};

// Aceternity button presets
export const AceternityButtonPresets = {
  primary: {
    type: 'primary',
    variant: 'glow',
    glowConfig: { color: '#3b82f6', size: 30, intensity: 0.5 },
  } as AceternityButtonProps,

  shimmer: {
    variant: 'shimmer',
    gradient: { from: '#3b82f6', to: '#8b5cf6' },
  } as AceternityButtonProps,

  aurora: {
    variant: 'aurora',
    particles: true,
  } as AceternityButtonProps,

  magic: {
    variant: 'border-magic',
    gradient: { from: '#f97316', via: '#eab308', to: '#84cc16' },
  } as AceternityButtonProps,

  cta: {
    type: 'primary',
    size: 'large',
    variant: 'shimmer',
    gradient: { from: '#8b5cf6', via: '#7c3aed', to: '#6d28d9' },
    animation: 'pulse',
  } as AceternityButtonProps,

  subtle: {
    type: 'text',
    variant: 'magnetic',
    animation: 'scale',
  } as AceternityButtonProps,
};

// Add global styles for animations
if (typeof window !== 'undefined' && !document.getElementById('aceternity-button-styles')) {
  const style = document.createElement('style');
  style.id = 'aceternity-button-styles';
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%) skewX(-12deg); }
      100% { transform: translateX(200%) skewX(-12deg); }
    }
    
    @keyframes border-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
