/**
 * Aceternity-Enhanced Card Component
 *
 * A sophisticated card component that combines Ant Design structure
 * with Aceternity UI's signature effects and animations
 */

import { Card as AntCard, type CardProps as AntCardProps } from 'antd';
import { type MotionValue, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type React from 'react';
import { type MouseEvent, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { useAnimations, useIsMobile, useTheme } from '../design-system-store';

export interface AceternityCardProps extends AntCardProps {
  variant?:
    | 'glare'
    | 'spotlight'
    | 'aurora'
    | 'holographic'
    | 'glass'
    | '3d'
    | 'evervault'
    | 'meteors';
  gradient?: {
    from: string;
    via?: string;
    to: string;
    direction?: string;
  };
  glow?: {
    color: string;
    size: number;
    intensity: number;
    blur?: number;
  };
  animation?: {
    hover?: 'lift' | 'tilt' | 'glow' | 'spotlight';
    entrance?: 'fade' | 'slide' | 'scale' | 'rotate';
    duration?: number;
  };
  effects?: {
    particles?: boolean;
    grid?: boolean;
    noise?: boolean;
    blur?: number;
  };
  containerClassName?: string;
  innerClassName?: string;
}

// Aceternity signature gradients
const aceternityGradients = {
  brand: 'from-blue-600 via-purple-600 to-pink-600',
  aurora: 'from-purple-400 via-pink-500 to-red-500',
  ocean: 'from-blue-400 via-teal-500 to-green-500',
  sunset: 'from-orange-400 via-red-500 to-pink-500',
  cosmic: 'from-purple-900 via-purple-400 to-pink-600',
  neon: 'from-green-400 via-blue-500 to-purple-600',
};

// Glare effect component (Aceternity signature)
const GlareEffect: React.FC<{ mouseX: MotionValue<number>; mouseY: MotionValue<number> }> = ({
  mouseX,
  mouseY,
}) => {
  const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

  return (
    <motion.div
      className="absolute inset-0 z-30 opacity-0 mix-blend-soft-light pointer-events-none"
      style={
        {
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.4), transparent 40%)`,
          '--mouse-x': glareX,
          '--mouse-y': glareY,
        } as any
      }
      initial={{ opacity: 0 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
};

// Meteors effect (Aceternity signature)
const MeteorsEffect: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <span
          key={i}
          className={cn(
            'absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]',
            'before:content-[""] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent'
          )}
          style={{
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 2 + 's',
            animationDuration: Math.random() * 8 + 10 + 's',
          }}
        />
      ))}
    </div>
  );
};

// Evervault card effect
const EvervaultGrid: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 opacity-50" />
      <div className="absolute inset-0 bg-[url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCwwIEwgMCwwIDAsNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+)] opacity-100" />
    </div>
  );
};

export const AceternityCard: React.FC<AceternityCardProps> = ({
  variant = 'glare',
  gradient,
  glow,
  animation = { hover: 'lift', entrance: 'fade', duration: 0.3 },
  effects = {},
  className,
  containerClassName,
  innerClassName,
  children,
  style,
  ...antProps
}) => {
  const animationsEnabled = useAnimations();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for smooth movement
  const springConfig = { damping: 20, stiffness: 300 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

  // Handle mouse movement for interactive effects
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!animationsEnabled || isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    mouseX.set(x - 0.5);
    mouseY.set(y - 0.5);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  // Build gradient background
  const gradientStyle = gradient
    ? {
        background: `linear-gradient(${gradient.direction || '135deg'}, ${gradient.from}, ${gradient.via || gradient.to}, ${gradient.to})`,
      }
    : {};

  // Build glow effect
  const glowStyle =
    glow && isHovered
      ? {
          boxShadow: `0 0 ${glow.blur || 40}px ${glow.size}px ${glow.color}${Math.round(
            glow.intensity * 255
          )
            .toString(16)
            .padStart(2, '0')}`,
        }
      : {};

  // Animation variants
  const cardVariants = {
    initial: {
      opacity: animation.entrance === 'fade' ? 0 : 1,
      y: animation.entrance === 'slide' ? 20 : 0,
      scale: animation.entrance === 'scale' ? 0.9 : 1,
      rotate: animation.entrance === 'rotate' ? -10 : 0,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        duration: animation.duration || 0.3,
        ease: [0.23, 1, 0.32, 1], // Aceternity's signature easing
      },
    },
    hover: {
      y: animation.hover === 'lift' ? -5 : 0,
      scale: animation.hover === 'glow' ? 1.02 : 1,
      transition: {
        duration: animation.duration || 0.3,
      },
    },
  };

  // Build the card content
  const cardContent = (
    <AntCard
      {...antProps}
      className={cn(
        'katalyst-aceternity-card',
        'relative overflow-hidden transition-all',
        {
          'bg-opacity-80 backdrop-blur-md': variant === 'glass',
          'bg-gradient-to-br': !!gradient,
          'border-0': variant === 'aurora' || variant === 'evervault',
        },
        className
      )}
      style={{
        ...gradientStyle,
        ...glowStyle,
        ...style,
      }}
    >
      {/* Background effects */}
      {variant === 'meteors' && <MeteorsEffect />}
      {variant === 'evervault' && <EvervaultGrid />}
      {variant === 'glare' && animationsEnabled && <GlareEffect mouseX={mouseX} mouseY={mouseY} />}

      {/* Aurora background */}
      {variant === 'aurora' && (
        <div className="absolute inset-0 -z-10">
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-30',
              aceternityGradients.aurora
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5" />
        </div>
      )}

      {/* Holographic effect */}
      {variant === 'holographic' && (
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(135deg, 
                  hsl(0, 100%, 50%) 0%,
                  hsl(60, 100%, 50%) 16.66%,
                  hsl(120, 100%, 50%) 33.33%,
                  hsl(180, 100%, 50%) 50%,
                  hsl(240, 100%, 50%) 66.66%,
                  hsl(300, 100%, 50%) 83.33%,
                  hsl(360, 100%, 50%) 100%)`,
              backgroundSize: '300% 300%',
              animation: animationsEnabled ? 'gradient-shift 8s ease infinite' : undefined,
            }}
          />
        </div>
      )}

      {/* Noise texture overlay */}
      {effects.noise && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Content wrapper */}
      <div className={cn('relative z-10', innerClassName)}>{children}</div>
    </AntCard>
  );

  // Return with motion wrapper for 3D effect
  if (variant === '3d' && animationsEnabled && !isMobile) {
    return (
      <motion.div
        ref={cardRef}
        className={cn('katalyst-aceternity-card-container', containerClassName)}
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: 1000,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          style={{
            rotateX: rotateX,
            rotateY: rotateY,
            transformStyle: 'preserve-3d',
          }}
        >
          {cardContent}
        </motion.div>
      </motion.div>
    );
  }

  // Return with basic motion wrapper
  return animationsEnabled ? (
    <motion.div
      ref={cardRef}
      className={cn('katalyst-aceternity-card-container', containerClassName)}
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {cardContent}
    </motion.div>
  ) : (
    <div ref={cardRef} className={cn('katalyst-aceternity-card-container', containerClassName)}>
      {cardContent}
    </div>
  );
};

// Export presets for common use cases
export const AceternityCardPresets = {
  feature: {
    variant: 'glare',
    animation: { hover: 'lift', entrance: 'fade' },
    gradient: { from: '#3b82f6', to: '#8b5cf6' },
  } as AceternityCardProps,

  pricing: {
    variant: 'holographic',
    animation: { hover: 'glow', entrance: 'scale' },
    effects: { noise: true },
  } as AceternityCardProps,

  testimonial: {
    variant: 'glass',
    animation: { hover: 'lift', entrance: 'slide' },
    effects: { blur: 10 },
  } as AceternityCardProps,

  hero: {
    variant: 'aurora',
    animation: { hover: 'tilt', entrance: 'fade' },
    gradient: aceternityGradients.cosmic,
  } as AceternityCardProps,

  dashboard: {
    variant: '3d',
    animation: { hover: 'tilt', entrance: 'fade' },
    effects: { grid: true },
  } as AceternityCardProps,
};
