/**
 * SafeAreaView Component
 *
 * Ensures content is rendered within safe area boundaries
 * Handles notches, dynamic islands, and system UI overlays
 */

import type React from 'react';
import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Device, Platform } from '../index';

export interface SafeAreaViewProps {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  mode?: 'padding' | 'margin';
  className?: string;
  style?: React.CSSProperties;
}

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  mode = 'padding',
  className,
  style,
}) => {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // Calculate safe area insets based on platform and device
    const calculateInsets = (): SafeAreaInsets => {
      if (Platform.isWeb()) {
        return { top: 0, bottom: 0, left: 0, right: 0 };
      }

      const calculatedInsets: SafeAreaInsets = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      };

      if (Platform.isIOS()) {
        // iOS safe area calculation
        if (Device.hasNotch() || Device.hasDynamicIsland()) {
          calculatedInsets.top = 44; // Status bar + notch/dynamic island
          calculatedInsets.bottom = 34; // Home indicator
        } else {
          calculatedInsets.top = 20; // Standard status bar
          calculatedInsets.bottom = 0;
        }

        // Check for landscape orientation
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape && (Device.hasNotch() || Device.hasDynamicIsland())) {
          calculatedInsets.left = 44;
          calculatedInsets.right = 44;
        }
      } else if (Platform.isAndroid()) {
        // Android safe area calculation
        calculatedInsets.top = 24; // Status bar
        calculatedInsets.bottom = 48; // Navigation bar (varies by device)

        // Check for gesture navigation
        if (typeof window !== 'undefined' && 'visualViewport' in window) {
          calculatedInsets.bottom = 24; // Gesture navigation
        }
      }

      // Use CSS environment variables if available (modern browsers/webviews)
      if (typeof window !== 'undefined' && CSS.supports('padding: env(safe-area-inset-top)')) {
        const rootStyle = getComputedStyle(document.documentElement);
        const envTop = rootStyle.getPropertyValue('env(safe-area-inset-top)');
        const envBottom = rootStyle.getPropertyValue('env(safe-area-inset-bottom)');
        const envLeft = rootStyle.getPropertyValue('env(safe-area-inset-left)');
        const envRight = rootStyle.getPropertyValue('env(safe-area-inset-right)');

        if (envTop) calculatedInsets.top = Number.parseInt(envTop, 10) || calculatedInsets.top;
        if (envBottom)
          calculatedInsets.bottom = Number.parseInt(envBottom, 10) || calculatedInsets.bottom;
        if (envLeft) calculatedInsets.left = Number.parseInt(envLeft, 10) || calculatedInsets.left;
        if (envRight)
          calculatedInsets.right = Number.parseInt(envRight, 10) || calculatedInsets.right;
      }

      return calculatedInsets;
    };

    setInsets(calculateInsets());

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => setInsets(calculateInsets()), 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Apply safe area insets only for specified edges
  const appliedInsets = {
    top: edges.includes('top') ? insets.top : 0,
    bottom: edges.includes('bottom') ? insets.bottom : 0,
    left: edges.includes('left') ? insets.left : 0,
    right: edges.includes('right') ? insets.right : 0,
  };

  // Create style object based on mode
  const safeAreaStyle: React.CSSProperties = {
    ...(mode === 'padding'
      ? {
          paddingTop: appliedInsets.top,
          paddingBottom: appliedInsets.bottom,
          paddingLeft: appliedInsets.left,
          paddingRight: appliedInsets.right,
        }
      : {
          marginTop: appliedInsets.top,
          marginBottom: appliedInsets.bottom,
          marginLeft: appliedInsets.left,
          marginRight: appliedInsets.right,
        }),
    ...style,
  };

  return (
    <div
      className={cn(
        'katalyst-safe-area-view',
        'relative flex-1',
        {
          'min-h-screen': Platform.isWeb(),
          'ios-safe-area': Platform.isIOS(),
          'android-safe-area': Platform.isAndroid(),
        },
        className
      )}
      style={safeAreaStyle}
      data-safe-area-top={appliedInsets.top}
      data-safe-area-bottom={appliedInsets.bottom}
      data-safe-area-left={appliedInsets.left}
      data-safe-area-right={appliedInsets.right}
    >
      {children}
    </div>
  );
};

// Hook for accessing safe area insets
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // Find the closest SafeAreaView and extract insets
    const safeAreaElement = document.querySelector('[data-safe-area-top]') as HTMLElement;
    if (safeAreaElement) {
      setInsets({
        top: Number.parseInt(safeAreaElement.dataset.safeAreaTop || '0', 10),
        bottom: Number.parseInt(safeAreaElement.dataset.safeAreaBottom || '0', 10),
        left: Number.parseInt(safeAreaElement.dataset.safeAreaLeft || '0', 10),
        right: Number.parseInt(safeAreaElement.dataset.safeAreaRight || '0', 10),
      });
    }
  }, []);

  return insets;
}
