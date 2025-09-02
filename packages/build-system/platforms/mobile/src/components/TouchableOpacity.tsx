/**
 * TouchableOpacity Component
 *
 * Mobile-optimized touchable component with haptic feedback
 * Provides native-like touch interactions
 */

import { type MotionProps, motion } from 'framer-motion';
import React, { type ReactNode, useState, useCallback, useRef } from 'react';
import { cn } from '../../utils/cn';
import { Platform } from '../index';
import { useHapticFeedback } from './HapticFeedback';

export interface TouchableOpacityProps extends Omit<MotionProps, 'onPress'> {
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
}

interface RippleState {
  x: number;
  y: number;
  id: number;
}

export const TouchableOpacity: React.FC<TouchableOpacityProps> = ({
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
  style,
  ...motionProps
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const { triggerHaptic } = useHapticFeedback();

  // Clear long press timeout
  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Handle press start
  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(true);

      // Trigger haptic feedback
      if (hapticFeedback !== 'none') {
        triggerHaptic(hapticFeedback);
      }

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
          setIsPressed(false);
        }, delayLongPress);
      }
    },
    [disabled, hapticFeedback, triggerHaptic, rippleEffect, onLongPress, delayLongPress]
  );

  // Handle press end
  const handlePressEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      setIsPressed(false);
      clearLongPressTimeout();

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

        if (isWithinBounds && onPress) {
          onPress();
        }
      }
    },
    [disabled, clearLongPressTimeout, hitSlop, onPress]
  );

  // Handle press cancel
  const handlePressCancel = useCallback(() => {
    setIsPressed(false);
    clearLongPressTimeout();
  }, [clearLongPressTimeout]);

  // Calculate hit slop styles
  const hitSlopStyle = React.useMemo(() => {
    if (!hitSlop) return {};

    const hitSlopValue = typeof hitSlop === 'number' ? hitSlop : 0;
    const hitSlopConfig = typeof hitSlop === 'object' ? hitSlop : {};

    return {
      margin: `${-(hitSlopConfig.top || hitSlopValue)}px ${-(hitSlopConfig.right || hitSlopValue)}px ${-(hitSlopConfig.bottom || hitSlopValue)}px ${-(hitSlopConfig.left || hitSlopValue)}px`,
    };
  }, [hitSlop]);

  return (
    <motion.div
      ref={elementRef}
      className={cn(
        'katalyst-touchable-opacity',
        'relative cursor-pointer select-none',
        'touch-manipulation', // Optimize for touch interactions
        {
          'opacity-50 cursor-not-allowed': disabled,
          'active:scale-95': Platform.isMobile() && !disabled,
        },
        className
      )}
      style={{
        ...hitSlopStyle,
        ...style,
      }}
      data-testid={testID}
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
      onMouseLeave={handlePressCancel}
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
          onPress?.();
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

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// Pressable alias for React Native compatibility
export const Pressable = TouchableOpacity;
