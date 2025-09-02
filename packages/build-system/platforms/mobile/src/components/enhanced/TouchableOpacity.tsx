/**
 * Enhanced TouchableOpacity Component with Re.Pack Integration
 *
 * Extends the base TouchableOpacity with Re.Pack features including
 * dynamic loading, performance monitoring, and federated interactions
 */

import { type MotionProps, motion } from 'framer-motion';
import React, { type ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { Platform } from '../../index';
import { useHapticFeedback } from '../HapticFeedback';
import { useRepack } from '../repack/RepackProvider';

export interface EnhancedTouchableOpacityProps extends Omit<MotionProps, 'onPress'> {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  delayLongPress?: number;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  pressRetentionOffset?: number | { top?: number; bottom?: number; left?: number; right?: number };
  hapticFeedback?: 'none' | 'light' | 'medium' | 'heavy' | 'selection';
  rippleEffect?: boolean;
  rippleColor?: string;
  className?: string;
  testID?: string;

  // Re.Pack enhanced features
  analytics?: {
    eventName?: string;
    properties?: Record<string, any>;
    remoteName?: string;
    moduleName?: string;
  };

  performance?: {
    measureInteraction?: boolean;
    preloadOnHover?: string; // Module to preload on hover
    trackTiming?: boolean;
  };

  federation?: {
    loadOnPress?: {
      remoteName: string;
      moduleName: string;
      props?: any;
    };
    enhanceWithModule?: {
      remoteName: string;
      moduleName: string;
      fallback?: ReactNode;
    };
  };

  adaptive?: {
    platformSpecific?: boolean;
    responsiveSize?: boolean;
    dynamicStyling?: boolean;
  };
}

interface RippleState {
  x: number;
  y: number;
  id: number;
}

interface InteractionMetrics {
  pressStartTime: number;
  pressDuration: number;
  interactionId: string;
}

export const EnhancedTouchableOpacity: React.FC<EnhancedTouchableOpacityProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  activeOpacity = 0.6,
  delayLongPress = 500,
  hitSlop,
  pressRetentionOffset,
  hapticFeedback = 'light',
  rippleEffect = Platform.isAndroid(),
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  className,
  testID,
  analytics,
  performance,
  federation,
  adaptive,
  style,
  ...motionProps
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const [enhancedComponent, setEnhancedComponent] = useState<React.ComponentType | null>(null);
  const [interactionMetrics, setInteractionMetrics] = useState<InteractionMetrics | null>(null);

  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerHaptic } = useHapticFeedback();
  const { loadRemoteModule, preloadRemoteModule, getPerformanceMetrics } = useRepack();

  // Load enhanced component if specified
  useEffect(() => {
    if (federation?.enhanceWithModule && !enhancedComponent) {
      const loadEnhancement = async () => {
        try {
          const module = await loadRemoteModule(
            federation.enhanceWithModule.remoteName,
            federation.enhanceWithModule.moduleName
          );
          setEnhancedComponent(() => module.default || module);
        } catch (error) {
          console.warn('Failed to load enhanced component:', error);
        }
      };

      loadEnhancement();
    }
  }, [federation?.enhanceWithModule, enhancedComponent, loadRemoteModule]);

  // Clear long press timeout
  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Track analytics
  const trackAnalytics = useCallback(
    async (eventName: string, properties: Record<string, any> = {}) => {
      if (!analytics) return;

      const eventData = {
        event: eventName,
        properties: {
          ...properties,
          platform: Platform.OS,
          timestamp: Date.now(),
          componentType: 'EnhancedTouchableOpacity',
          ...analytics.properties,
        },
      };

      if (analytics.remoteName && analytics.moduleName) {
        try {
          const analyticsModule = await loadRemoteModule(
            analytics.remoteName,
            analytics.moduleName
          );
          analyticsModule.track?.(eventData);
        } catch (error) {
          console.warn('Failed to load analytics module:', error);
          // Fallback to local analytics
          console.log('Analytics Event:', eventData);
        }
      } else {
        // Local analytics tracking
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track(eventData.event, eventData.properties);
        }
      }
    },
    [analytics, loadRemoteModule]
  );

  // Performance measurement
  const measurePerformance = useCallback(
    (action: 'start' | 'end') => {
      if (!performance?.measureInteraction) return;

      if (action === 'start') {
        const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setInteractionMetrics({
          pressStartTime: Date.now(),
          pressDuration: 0,
          interactionId,
        });

        if (performance.trackTiming) {
          performance.mark?.(`${interactionId}_start`);
        }
      } else if (action === 'end' && interactionMetrics) {
        const pressDuration = Date.now() - interactionMetrics.pressStartTime;

        setInteractionMetrics((prev) =>
          prev
            ? {
                ...prev,
                pressDuration,
              }
            : null
        );

        if (performance.trackTiming) {
          performance.mark?.(`${interactionMetrics.interactionId}_end`);
          performance.measure?.(
            `interaction_${interactionMetrics.interactionId}`,
            `${interactionMetrics.interactionId}_start`,
            `${interactionMetrics.interactionId}_end`
          );
        }

        // Track performance analytics
        trackAnalytics('interaction_performance', {
          duration: pressDuration,
          interactionId: interactionMetrics.interactionId,
        });
      }
    },
    [performance, interactionMetrics, trackAnalytics]
  );

  // Handle press start
  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(true);
      measurePerformance('start');

      // Trigger haptic feedback
      if (hapticFeedback !== 'none') {
        triggerHaptic(hapticFeedback);
      }

      // Track analytics
      trackAnalytics(analytics?.eventName || 'button_press_start');

      // Create ripple effect
      if (rippleEffect && elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const rippleId = Date.now();
        setRipples((prev) => [...prev, { x, y, id: rippleId }]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== rippleId));
        }, 600);
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          onLongPress();
          trackAnalytics('button_long_press');
          setIsPressed(false);
          measurePerformance('end');
        }, delayLongPress);
      }
    },
    [
      disabled,
      hapticFeedback,
      triggerHaptic,
      rippleEffect,
      onLongPress,
      delayLongPress,
      trackAnalytics,
      analytics?.eventName,
      measurePerformance,
    ]
  );

  // Handle press end
  const handlePressEnd = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(false);
      clearLongPressTimeout();
      measurePerformance('end');

      // Check if touch ended within component bounds (considering hit slop)
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        // Calculate effective bounds with hit slop
        const hitSlopValue = typeof hitSlop === 'number' ? hitSlop : 0;
        const hitSlopConfig = typeof hitSlop === 'object' ? hitSlop : {};

        const effectiveBounds = {
          left: rect.left - (hitSlopConfig.left || hitSlopValue),
          right: rect.right + (hitSlopConfig.right || hitSlopValue),
          top: rect.top - (hitSlopConfig.top || hitSlopValue),
          bottom: rect.bottom + (hitSlopConfig.bottom || hitSlopValue),
        };

        const isWithinBounds =
          clientX >= effectiveBounds.left &&
          clientX <= effectiveBounds.right &&
          clientY >= effectiveBounds.top &&
          clientY <= effectiveBounds.bottom;

        if (isWithinBounds) {
          // Handle federated module loading on press
          if (federation?.loadOnPress) {
            try {
              const module = await loadRemoteModule(
                federation.loadOnPress.remoteName,
                federation.loadOnPress.moduleName
              );

              // Execute the loaded module with props
              if (typeof module.default === 'function') {
                module.default(federation.loadOnPress.props);
              }

              trackAnalytics('federated_module_loaded', {
                remoteName: federation.loadOnPress.remoteName,
                moduleName: federation.loadOnPress.moduleName,
              });
            } catch (error) {
              console.error('Failed to load federated module on press:', error);
              trackAnalytics('federated_module_load_error', {
                error: error.message,
              });
            }
          }

          // Execute original onPress
          if (onPress) {
            onPress();
            trackAnalytics(analytics?.eventName || 'button_press');
          }
        }
      }
    },
    [
      disabled,
      clearLongPressTimeout,
      hitSlop,
      onPress,
      federation?.loadOnPress,
      loadRemoteModule,
      trackAnalytics,
      analytics?.eventName,
      measurePerformance,
    ]
  );

  // Handle press cancel
  const handlePressCancel = useCallback(() => {
    setIsPressed(false);
    clearLongPressTimeout();
    measurePerformance('end');
    trackAnalytics('button_press_cancel');
  }, [clearLongPressTimeout, trackAnalytics, measurePerformance]);

  // Handle hover for preloading
  const handleMouseEnter = useCallback(() => {
    if (performance?.preloadOnHover) {
      hoverTimeoutRef.current = setTimeout(() => {
        const [remoteName, moduleName] = performance.preloadOnHover.split('/');
        preloadRemoteModule(remoteName, moduleName);
        trackAnalytics('module_preloaded_on_hover', {
          remoteName,
          moduleName,
        });
      }, 100); // Small delay to avoid excessive preloading
    }
  }, [performance?.preloadOnHover, preloadRemoteModule, trackAnalytics]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    handlePressCancel();
  }, [handlePressCancel]);

  // Calculate hit slop styles
  const hitSlopStyle = React.useMemo(() => {
    if (!hitSlop) return {};

    const hitSlopValue = typeof hitSlop === 'number' ? hitSlop : 0;
    const hitSlopConfig = typeof hitSlop === 'object' ? hitSlop : {};

    return {
      margin: `${-(hitSlopConfig.top || hitSlopValue)}px ${-(hitSlopConfig.right || hitSlopValue)}px ${-(hitSlopConfig.bottom || hitSlopValue)}px ${-(hitSlopConfig.left || hitSlopValue)}px`,
    };
  }, [hitSlop]);

  // Adaptive styling
  const adaptiveClasses = React.useMemo(() => {
    if (!adaptive) return '';

    const classes = [];

    if (adaptive.platformSpecific) {
      classes.push(Platform.isIOS() ? 'ios-specific' : 'android-specific');
    }

    if (adaptive.responsiveSize) {
      classes.push('sm:text-sm md:text-base lg:text-lg');
    }

    return classes.join(' ');
  }, [adaptive]);

  // If enhanced component is available, render it instead
  if (enhancedComponent) {
    const EnhancedComponent = enhancedComponent;
    return (
      <EnhancedComponent
        {...motionProps}
        onPress={handlePressEnd}
        disabled={disabled}
        className={className}
        testID={testID}
      >
        {children}
      </EnhancedComponent>
    );
  }

  return (
    <motion.div
      ref={elementRef}
      className={cn(
        'katalyst-enhanced-touchable-opacity',
        'relative cursor-pointer select-none',
        'touch-manipulation', // Optimize for touch interactions
        {
          'opacity-50 cursor-not-allowed': disabled,
          'active:scale-95': Platform.isMobile() && !disabled,
        },
        adaptiveClasses,
        className
      )}
      style={{
        ...hitSlopStyle,
        ...style,
      }}
      data-testid={testID}
      data-interaction-id={interactionMetrics?.interactionId}
      animate={{
        opacity: disabled ? 0.5 : isPressed ? activeOpacity : 1,
        scale: isPressed ? 0.98 : 1,
      }}
      transition={{
        duration: 0.1,
        ease: 'easeOut',
      }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      // Accessibility
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePressEnd(e as any);
        }
      }}
      {...motionProps}
    >
      {/* Ripple effects */}
      {rippleEffect && (
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                backgroundColor: rippleColor,
              }}
              initial={{
                width: 0,
                height: 0,
                opacity: 0.8,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                width: 200,
                height: 200,
                opacity: 0,
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' &&
        performance?.measureInteraction &&
        interactionMetrics && (
          <div className="absolute top-0 right-0 text-xs bg-blue-100 text-blue-800 px-1 rounded">
            {interactionMetrics.pressDuration}ms
          </div>
        )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// Enhanced Pressable alias for React Native compatibility
export const EnhancedPressable = EnhancedTouchableOpacity;
