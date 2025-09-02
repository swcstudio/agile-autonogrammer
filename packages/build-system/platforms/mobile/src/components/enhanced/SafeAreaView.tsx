/**
 * Enhanced SafeAreaView Component with Re.Pack Integration
 *
 * Extends the base SafeAreaView with Re.Pack features including
 * dynamic safe area detection, federated header/footer components,
 * and adaptive layouts
 */

import { motion } from 'framer-motion';
import type React from 'react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../../utils/cn';
import { Device, Platform } from '../../index';
import { ModuleFederationLoader } from '../repack/ModuleFederationLoader';
import { useRepack } from '../repack/RepackProvider';

export interface EnhancedSafeAreaViewProps {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  mode?: 'padding' | 'margin';
  className?: string;
  style?: React.CSSProperties;

  // Re.Pack enhanced features
  federation?: {
    header?: {
      remoteName: string;
      moduleName: string;
      props?: any;
      alwaysVisible?: boolean;
    };
    footer?: {
      remoteName: string;
      moduleName: string;
      props?: any;
      alwaysVisible?: boolean;
    };
    overlay?: {
      remoteName: string;
      moduleName: string;
      props?: any;
      position?: 'top' | 'bottom' | 'center';
    };
  };

  adaptive?: {
    responsiveBreakpoints?: boolean;
    dynamicInsets?: boolean;
    orientationAware?: boolean;
    notchAware?: boolean;
  };

  performance?: {
    virtualizeContent?: boolean;
    lazyLoadComponents?: boolean;
    measureLayout?: boolean;
  };

  analytics?: {
    trackViewport?: boolean;
    trackSafeArea?: boolean;
    remoteName?: string;
    moduleName?: string;
  };
}

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  safeAreaInsets: SafeAreaInsets;
}

export const EnhancedSafeAreaView: React.FC<EnhancedSafeAreaViewProps> = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  mode = 'padding',
  className,
  style,
  federation,
  adaptive,
  performance,
  analytics,
}) => {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const { loadRemoteModule } = useRepack();

  // Enhanced safe area calculation
  const calculateEnhancedInsets = useCallback(async (): Promise<SafeAreaInsets> => {
    let calculatedInsets: SafeAreaInsets = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };

    if (Platform.isWeb()) {
      // Web-specific safe area detection
      if (CSS.supports('padding: env(safe-area-inset-top)')) {
        const rootStyle = getComputedStyle(document.documentElement);
        const envTop = rootStyle.getPropertyValue('env(safe-area-inset-top)');
        const envBottom = rootStyle.getPropertyValue('env(safe-area-inset-bottom)');
        const envLeft = rootStyle.getPropertyValue('env(safe-area-inset-left)');
        const envRight = rootStyle.getPropertyValue('env(safe-area-inset-right)');

        calculatedInsets = {
          top: envTop ? Number.parseInt(envTop, 10) : 0,
          bottom: envBottom ? Number.parseInt(envBottom, 10) : 0,
          left: envLeft ? Number.parseInt(envLeft, 10) : 0,
          right: envRight ? Number.parseInt(envRight, 10) : 0,
        };
      }
    } else {
      // Native platform calculation
      if (Platform.isIOS()) {
        // Enhanced iOS detection
        if (Device.hasDynamicIsland()) {
          calculatedInsets.top = 59; // Dynamic Island + status bar
          calculatedInsets.bottom = 34; // Home indicator
        } else if (Device.hasNotch()) {
          calculatedInsets.top = 44; // Notch + status bar
          calculatedInsets.bottom = 34; // Home indicator
        } else {
          calculatedInsets.top = 20; // Standard status bar
          calculatedInsets.bottom = 0;
        }

        // Landscape adjustments
        if (orientation === 'landscape') {
          if (Device.hasNotch() || Device.hasDynamicIsland()) {
            calculatedInsets.left = 44;
            calculatedInsets.right = 44;
            calculatedInsets.top = 0;
          }
        }
      } else if (Platform.isAndroid()) {
        // Enhanced Android detection
        calculatedInsets.top = 24; // Status bar

        // Check for gesture navigation vs button navigation
        const hasGestureNav = await checkGestureNavigation();
        calculatedInsets.bottom = hasGestureNav ? 24 : 48;
      }
    }

    // Adaptive adjustments
    if (adaptive?.dynamicInsets) {
      // Adjust for keyboard
      if (isKeyboardVisible) {
        calculatedInsets.bottom = Math.max(calculatedInsets.bottom, 300); // Estimated keyboard height
      }

      // Adjust for federation components
      if (federation?.header) {
        calculatedInsets.top += 60; // Estimated header height
      }
      if (federation?.footer) {
        calculatedInsets.bottom += 60; // Estimated footer height
      }
    }

    return calculatedInsets;
  }, [orientation, isKeyboardVisible, adaptive?.dynamicInsets, federation]);

  // Check for gesture navigation on Android
  const checkGestureNavigation = async (): Promise<boolean> => {
    if (Platform.isAndroid()) {
      // Use native bridge to check navigation type
      try {
        const { bridgeToNative } = await import('../../../hooks/use-rspeedy');
        const navType = await bridgeToNative('System', 'getNavigationType');
        return navType === 'gesture';
      } catch {
        // Fallback: detect based on viewport
        return window.visualViewport ? true : false;
      }
    }
    return false;
  };

  // Update viewport info
  const updateViewportInfo = useCallback(async () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const newOrientation = width > height ? 'landscape' : 'portrait';
    const pixelRatio = window.devicePixelRatio || 1;

    setOrientation(newOrientation);

    const safeAreaInsets = await calculateEnhancedInsets();
    setInsets(safeAreaInsets);

    const info: ViewportInfo = {
      width,
      height,
      orientation: newOrientation,
      pixelRatio,
      safeAreaInsets,
    };

    setViewportInfo(info);

    // Track analytics if enabled
    if (analytics?.trackViewport) {
      trackAnalytics('viewport_change', {
        ...info,
        platform: Platform.OS,
        device: {
          hasNotch: Device.hasNotch(),
          hasDynamicIsland: Device.hasDynamicIsland(),
          model: Device.getModel(),
        },
      });
    }
  }, [calculateEnhancedInsets, analytics]);

  // Analytics tracking
  const trackAnalytics = useCallback(
    async (eventName: string, properties: Record<string, any> = {}) => {
      if (!analytics) return;

      if (analytics.remoteName && analytics.moduleName) {
        try {
          const analyticsModule = await loadRemoteModule(
            analytics.remoteName,
            analytics.moduleName
          );
          analyticsModule.track?.(eventName, {
            ...properties,
            timestamp: Date.now(),
            componentType: 'EnhancedSafeAreaView',
          });
        } catch (error) {
          console.warn('Failed to load analytics module:', error);
        }
      }
    },
    [analytics, loadRemoteModule]
  );

  // Initialize and listen for changes
  useEffect(() => {
    updateViewportInfo();

    // Keyboard detection
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        setIsKeyboardVisible(keyboardHeight > 150); // Threshold for keyboard detection
        updateViewportInfo();
      }
    };

    // Orientation and resize handling
    const handleOrientationChange = () => {
      setTimeout(updateViewportInfo, 100); // Small delay for layout settling
    };

    const handleResize = () => {
      updateViewportInfo();
    };

    // Event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, [updateViewportInfo]);

  // Track safe area analytics
  useEffect(() => {
    if (analytics?.trackSafeArea && viewportInfo) {
      trackAnalytics('safe_area_calculated', {
        insets,
        viewport: viewportInfo,
      });
    }
  }, [insets, viewportInfo, analytics?.trackSafeArea, trackAnalytics]);

  // Apply safe area insets only for specified edges
  const appliedInsets = useMemo(() => {
    return {
      top: edges.includes('top') ? insets.top : 0,
      bottom: edges.includes('bottom') ? insets.bottom : 0,
      left: edges.includes('left') ? insets.left : 0,
      right: edges.includes('right') ? insets.right : 0,
    };
  }, [edges, insets]);

  // Create style object based on mode
  const safeAreaStyle: React.CSSProperties = useMemo(() => {
    const baseStyle =
      mode === 'padding'
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
          };

    return {
      ...baseStyle,
      ...style,
    };
  }, [mode, appliedInsets, style]);

  // Responsive breakpoint classes
  const responsiveClasses = useMemo(() => {
    if (!adaptive?.responsiveBreakpoints || !viewportInfo) return '';

    const classes = [];

    if (viewportInfo.width < 640) classes.push('mobile');
    else if (viewportInfo.width < 1024) classes.push('tablet');
    else classes.push('desktop');

    if (viewportInfo.orientation === 'landscape') classes.push('landscape');
    else classes.push('portrait');

    return classes.join(' ');
  }, [adaptive?.responsiveBreakpoints, viewportInfo]);

  return (
    <motion.div
      className={cn(
        'katalyst-enhanced-safe-area-view',
        'relative flex-1',
        {
          'min-h-screen': Platform.isWeb(),
          'ios-safe-area': Platform.isIOS(),
          'android-safe-area': Platform.isAndroid(),
          'has-notch': Device.hasNotch(),
          'has-dynamic-island': Device.hasDynamicIsland(),
          'keyboard-visible': isKeyboardVisible,
        },
        responsiveClasses,
        className
      )}
      style={safeAreaStyle}
      data-safe-area-top={appliedInsets.top}
      data-safe-area-bottom={appliedInsets.bottom}
      data-safe-area-left={appliedInsets.left}
      data-safe-area-right={appliedInsets.right}
      data-orientation={orientation}
      data-viewport-width={viewportInfo?.width}
      data-viewport-height={viewportInfo?.height}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Federated Header */}
      {federation?.header && (
        <div className="federated-header">
          <ModuleFederationLoader
            remoteName={federation.header.remoteName}
            moduleName={federation.header.moduleName}
            props={{
              ...federation.header.props,
              safeAreaInsets: appliedInsets,
              viewportInfo,
            }}
            fallback={<div className="h-16 bg-gray-100" />}
            preload={true}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {performance?.virtualizeContent ? (
          <VirtualizedContent>{children}</VirtualizedContent>
        ) : (
          children
        )}
      </main>

      {/* Federated Footer */}
      {federation?.footer && (
        <div className="federated-footer">
          <ModuleFederationLoader
            remoteName={federation.footer.remoteName}
            moduleName={federation.footer.moduleName}
            props={{
              ...federation.footer.props,
              safeAreaInsets: appliedInsets,
              viewportInfo,
            }}
            fallback={<div className="h-16 bg-gray-100" />}
            preload={true}
          />
        </div>
      )}

      {/* Federated Overlay */}
      {federation?.overlay && (
        <div
          className={cn('absolute inset-x-0 z-50', {
            'top-0': federation.overlay.position === 'top',
            'bottom-0': federation.overlay.position === 'bottom',
            'top-1/2 -translate-y-1/2': federation.overlay.position === 'center',
          })}
        >
          <ModuleFederationLoader
            remoteName={federation.overlay.remoteName}
            moduleName={federation.overlay.moduleName}
            props={{
              ...federation.overlay.props,
              safeAreaInsets: appliedInsets,
              viewportInfo,
            }}
            preload={false}
          />
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-0 left-0 bg-black bg-opacity-75 text-white text-xs p-2 z-50">
          <div>Safe Area: {JSON.stringify(appliedInsets)}</div>
          <div>Orientation: {orientation}</div>
          <div>Keyboard: {isKeyboardVisible ? 'visible' : 'hidden'}</div>
          {viewportInfo && (
            <div>
              Viewport: {viewportInfo.width}x{viewportInfo.height}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Virtualized content wrapper for performance
function VirtualizedContent({ children }: { children: ReactNode }) {
  return <div className="virtualized-content h-full overflow-auto">{children}</div>;
}

// Hook for accessing enhanced safe area information
export function useEnhancedSafeAreaInsets(): {
  insets: SafeAreaInsets;
  viewportInfo: ViewportInfo | null;
  orientation: 'portrait' | 'landscape';
  isKeyboardVisible: boolean;
} {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Find the closest EnhancedSafeAreaView and extract data
    const safeAreaElement = document.querySelector('[data-safe-area-top]') as HTMLElement;
    if (safeAreaElement) {
      setInsets({
        top: Number.parseInt(safeAreaElement.dataset.safeAreaTop || '0', 10),
        bottom: Number.parseInt(safeAreaElement.dataset.safeAreaBottom || '0', 10),
        left: Number.parseInt(safeAreaElement.dataset.safeAreaLeft || '0', 10),
        right: Number.parseInt(safeAreaElement.dataset.safeAreaRight || '0', 10),
      });

      setOrientation((safeAreaElement.dataset.orientation as any) || 'portrait');

      if (safeAreaElement.dataset.viewportWidth && safeAreaElement.dataset.viewportHeight) {
        setViewportInfo({
          width: Number.parseInt(safeAreaElement.dataset.viewportWidth, 10),
          height: Number.parseInt(safeAreaElement.dataset.viewportHeight, 10),
          orientation: (safeAreaElement.dataset.orientation as any) || 'portrait',
          pixelRatio: window.devicePixelRatio || 1,
          safeAreaInsets: insets,
        });
      }

      setIsKeyboardVisible(safeAreaElement.classList.contains('keyboard-visible'));
    }
  }, []);

  return {
    insets,
    viewportInfo,
    orientation,
    isKeyboardVisible,
  };
}
