'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface GridLineProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  opacity?: number;
  color?: string;
  animated?: boolean;
  pattern?: 'solid' | 'dashed' | 'dotted';
}

const GridLineHorizontal = React.forwardRef<HTMLDivElement, GridLineProps>(
  (
    {
      className,
      thickness = 1,
      opacity = 0.1,
      color = 'currentColor',
      animated = false,
      pattern = 'solid',
      style,
      ...props
    },
    ref
  ) => {
    const lineStyle = {
      height: `${thickness}px`,
      opacity,
      backgroundColor: color,
      ...style,
    };

    const patternClasses = {
      solid: '',
      dashed: 'border-t border-dashed bg-transparent',
      dotted: 'border-t border-dotted bg-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute w-full pointer-events-none',
          animated && 'animate-pulse',
          pattern !== 'solid' && patternClasses[pattern],
          className
        )}
        style={
          pattern === 'solid'
            ? lineStyle
            : {
                ...style,
                borderColor: color,
                opacity,
                borderTopWidth: `${thickness}px`,
              }
        }
        {...props}
      />
    );
  }
);

GridLineHorizontal.displayName = 'GridLineHorizontal';

const GridLineVertical = React.forwardRef<HTMLDivElement, GridLineProps>(
  (
    {
      className,
      thickness = 1,
      opacity = 0.1,
      color = 'currentColor',
      animated = false,
      pattern = 'solid',
      style,
      ...props
    },
    ref
  ) => {
    const lineStyle = {
      width: `${thickness}px`,
      opacity,
      backgroundColor: color,
      ...style,
    };

    const patternClasses = {
      solid: '',
      dashed: 'border-l border-dashed bg-transparent',
      dotted: 'border-l border-dotted bg-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute h-full pointer-events-none',
          animated && 'animate-pulse',
          pattern !== 'solid' && patternClasses[pattern],
          className
        )}
        style={
          pattern === 'solid'
            ? lineStyle
            : {
                ...style,
                borderColor: color,
                opacity,
                borderLeftWidth: `${thickness}px`,
              }
        }
        {...props}
      />
    );
  }
);

GridLineVertical.displayName = 'GridLineVertical';

interface GridPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  x?: string | number;
  y?: string | number;
  strokeDasharray?: string;
  squares?: [number, number][];
  className?: string;
}

const GridPattern = React.forwardRef<HTMLDivElement, GridPatternProps>(
  (
    {
      width = 40,
      height = 40,
      x = 0,
      y = 0,
      strokeDasharray = '0',
      squares = [],
      className,
      ...props
    },
    ref
  ) => {
    const id = React.useId();

    return (
      <div ref={ref} className={cn('pointer-events-none', className)} {...props}>
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30"
        >
          <defs>
            <pattern
              id={id}
              width={width}
              height={height}
              patternUnits="userSpaceOnUse"
              x={x}
              y={y}
            >
              <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
          {squares && (
            <svg x={x} y={y} className="overflow-visible">
              {squares.map(([x, y]) => (
                <rect
                  strokeWidth="0"
                  key={`${x}-${y}`}
                  width={width - 1}
                  height={height - 1}
                  x={x * width + 1}
                  y={y * height + 1}
                />
              ))}
            </svg>
          )}
        </svg>
      </div>
    );
  }
);

GridPattern.displayName = 'GridPattern';

interface GridOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: 'light' | 'medium' | 'heavy';
  variant?: 'dots' | 'lines' | 'grid';
  animated?: boolean;
  color?: string;
}

const GridOverlay = React.forwardRef<HTMLDivElement, GridOverlayProps>(
  (
    {
      className,
      density = 'light',
      variant = 'grid',
      animated = false,
      color = 'rgb(148 163 184)',
      style,
      ...props
    },
    ref
  ) => {
    const densityConfig = {
      light: { size: 80, opacity: 0.03 },
      medium: { size: 40, opacity: 0.05 },
      heavy: { size: 20, opacity: 0.08 },
    };

    const config = densityConfig[density];

    const variantStyles = {
      dots: {
        backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        backgroundSize: `${config.size}px ${config.size}px`,
      },
      lines: {
        backgroundImage: `
          linear-gradient(to right, ${color} 1px, transparent 1px),
          linear-gradient(to bottom, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${config.size}px ${config.size}px`,
      },
      grid: {
        backgroundImage: `
          linear-gradient(to right, ${color} 1px, transparent 1px),
          linear-gradient(to bottom, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${config.size}px ${config.size}px`,
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 pointer-events-none',
          animated && 'animate-pulse',
          className
        )}
        style={{
          ...variantStyles[variant],
          opacity: config.opacity,
          ...style,
        }}
        {...props}
      />
    );
  }
);

GridOverlay.displayName = 'GridOverlay';

// Web3/AI themed grid components
export const Web3GridOverlay = React.forwardRef<HTMLDivElement, Omit<GridOverlayProps, 'color'>>(
  ({ className, ...props }, ref) => (
    <GridOverlay
      ref={ref}
      color="rgb(59 130 246)"
      className={cn('opacity-20', className)}
      {...props}
    />
  )
);

Web3GridOverlay.displayName = 'Web3GridOverlay';

export const AIGridOverlay = React.forwardRef<HTMLDivElement, Omit<GridOverlayProps, 'color'>>(
  ({ className, ...props }, ref) => (
    <GridOverlay
      ref={ref}
      color="rgb(20 184 166)"
      className={cn('opacity-20', className)}
      {...props}
    />
  )
);

AIGridOverlay.displayName = 'AIGridOverlay';

export { GridLineHorizontal, GridLineVertical, GridPattern, GridOverlay };
export type { GridLineProps, GridPatternProps, GridOverlayProps };
