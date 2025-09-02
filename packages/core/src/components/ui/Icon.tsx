/**
 * Icon Component - SVG Icon System with SVGR
 *
 * A flexible icon system that leverages SVGR to transform SVG files
 * into optimized React components with full TypeScript support
 */

import type React from 'react';
import { forwardRef } from 'react';
import { cn } from '../../utils';

import ArrowRight from '../../assets/icons/arrow-right.svg';
import Check from '../../assets/icons/check.svg';
import Heart from '../../assets/icons/heart.svg';
// Import SVG icons as React components
import KatalystLogo from '../../assets/icons/katalyst-logo.svg';
import Star from '../../assets/icons/star.svg';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: keyof typeof iconMap;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  title?: string;
}

// Icon size mappings
const sizeMap = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

// Available icons mapping
const iconMap = {
  'katalyst-logo': KatalystLogo,
  'arrow-right': ArrowRight,
  heart: Heart,
  star: Star,
  check: Check,
} as const;

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 'md', className, title, ...props }, ref) => {
    const IconComponent = iconMap[name];

    if (!IconComponent) {
      console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(iconMap));
      return null;
    }

    const iconSize = typeof size === 'number' ? size : sizeMap[size];

    return (
      <IconComponent
        ref={ref}
        width={iconSize}
        height={iconSize}
        title={title}
        className={cn('inline-block flex-shrink-0', 'transition-colors duration-200', className)}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

// Individual icon exports for direct usage
export { KatalystLogo, ArrowRight, Heart, Star, Check };

// Type exports
export type IconName = keyof typeof iconMap;
export type IconSize = keyof typeof sizeMap;

// Available icons list for reference
export const availableIcons = Object.keys(iconMap) as IconName[];

// Utility function to check if an icon exists
export const hasIcon = (name: string): name is IconName => {
  return name in iconMap;
};
