import { Card as AntCard, type CardProps as AntCardProps } from 'antd';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type React from 'react';
import { useRef, useState } from 'react';
import { cn } from '../../utils';
import { useAnimations, useIsMobile } from '../design-system-store';

export interface GlowCardProps extends AntCardProps {
  variant?: 'glow' | 'spotlight' | 'aurora' | 'holographic' | 'glass' | '3d';
  glowColor?: string;
  glowSize?: number;
  intensity?: number;
  enableTilt?: boolean;
  maxTilt?: number;
  scale?: number;
  spotlightColor?: string;
  auroraColors?: string[];
  containerClassName?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  variant = 'glow',
  glowColor = 'var(--katalyst-primary)',
  glowSize = 400,
  intensity = 0.5,
  enableTilt = true,
  maxTilt = 15,
  scale = 1.05,
  spotlightColor = 'rgba(255, 255, 255, 0.1)',
  auroraColors = ['#e11d48', '#8b5cf6', '#3b82f6'],
  className,
  containerClassName,
  children,
  ...antProps
}) => {
  const animationsEnabled = useAnimations();
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for smooth animation
  const springConfig = { damping: 10, stiffness: 100 };
  const rotateLevelX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]),
    springConfig
  );
  const rotateLevelY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]),
    springConfig
  );

  // Handle mouse move for effects
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!animationsEnabled || isMobile || !enableTilt) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Normalize mouse position (-0.5 to 0.5)
    const normalizedX = (x - centerX) / rect.width;
    const normalizedY = (y - centerY) / rect.height;

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);

    // Set CSS variables for effects
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
    card.style.setProperty('--glow-x', `${x}px`);
    card.style.setProperty('--glow-y', `${y}px`);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  // Variant styles
  const variantStyles = {
    glow: {
      background: `radial-gradient(${glowSize}px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glowColor}${Math.round(intensity * 255).toString(16)}, transparent 40%)`,
    },
    spotlight: {
      background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${spotlightColor}, transparent 40%)`,
    },
    aurora: {
      background: `linear-gradient(135deg, ${auroraColors.join(', ')})`,
      backgroundSize: '200% 200%',
      animation: animationsEnabled ? 'aurora 6s ease infinite' : undefined,
    },
    holographic: {
      background: `linear-gradient(135deg, 
        hsl(0, 100%, 50%) 0%,
        hsl(60, 100%, 50%) 16.66%,
        hsl(120, 100%, 50%) 33.33%,
        hsl(180, 100%, 50%) 50%,
        hsl(240, 100%, 50%) 66.66%,
        hsl(300, 100%, 50%) 83.33%,
        hsl(360, 100%, 50%) 100%)`,
      backgroundSize: '300% 300%',
      backgroundPosition: isHovered ? '100% 100%' : '0% 0%',
      transition: 'background-position 1s ease',
      filter: 'brightness(0.8) contrast(1.2)',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    '3d': {
      transformStyle: 'preserve-3d' as any,
      transform:
        enableTilt && animationsEnabled && isHovered
          ? `perspective(1000px) rotateX(${rotateLevelX.get()}deg) rotateY(${rotateLevelY.get()}deg) scale(${scale})`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    },
  };

  const cardContent = (
    <AntCard
      {...antProps}
      className={cn(
        'katalyst-glow-card',
        'relative overflow-hidden transition-all duration-300',
        {
          'hover:shadow-2xl': animationsEnabled && !isMobile,
          'backdrop-blur-md': variant === 'glass',
        },
        className
      )}
      style={{
        ...variantStyles[variant],
        ...antProps.style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow overlay for additional effects */}
      {variant === 'glow' && animationsEnabled && (
        <div
          className={cn(
            'absolute inset-0 opacity-0 transition-opacity duration-300',
            'pointer-events-none z-0',
            isHovered && 'opacity-100'
          )}
          style={{
            background: `radial-gradient(${glowSize}px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glowColor}40, transparent 40%)`,
          }}
        />
      )}

      {/* Holographic shimmer effect */}
      {variant === 'holographic' && animationsEnabled && (
        <div
          className={cn(
            'absolute inset-0 opacity-0 transition-opacity duration-300',
            'pointer-events-none mix-blend-overlay',
            isHovered && 'opacity-30'
          )}
          style={{
            background:
              'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.5) 50%, transparent 70%)',
            transform: 'translateX(-100%)',
            animation: isHovered ? 'shimmer 0.5s ease-out' : undefined,
          }}
        />
      )}

      {/* Content with proper z-index */}
      <div className="relative z-10">{children}</div>
    </AntCard>
  );

  // For 3D variant, wrap in motion.div
  if (variant === '3d' && animationsEnabled && !isMobile) {
    return (
      <motion.div
        ref={cardRef}
        className={cn('katalyst-glow-card-container', containerClassName)}
        style={{
          rotateX: rotateLevelX,
          rotateY: rotateLevelY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ scale: scale }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div ref={cardRef} className={cn('katalyst-glow-card-container', containerClassName)}>
      {cardContent}
    </div>
  );
};

// Preset configurations
export const GlowCardPresets = {
  feature: {
    variant: 'glow',
    hoverable: true,
    glowColor: '#3b82f6',
    intensity: 0.6,
  } as GlowCardProps,

  pricing: {
    variant: 'holographic',
    hoverable: true,
    enableTilt: true,
    maxTilt: 10,
  } as GlowCardProps,

  testimonial: {
    variant: 'glass',
    bordered: false,
  } as GlowCardProps,

  product: {
    variant: '3d',
    hoverable: true,
    enableTilt: true,
    scale: 1.05,
  } as GlowCardProps,

  stats: {
    variant: 'aurora',
    auroraColors: ['#3b82f6', '#8b5cf6', '#ec4899'],
  } as GlowCardProps,
};

// Mobile-optimized card
export const MobileGlowCard: React.FC<GlowCardProps> = (props) => {
  return (
    <GlowCard
      {...props}
      enableTilt={false}
      variant={props.variant === '3d' ? 'glow' : props.variant}
      className={cn('touch-manipulation', props.className)}
    />
  );
};
