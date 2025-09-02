/**
 * HapticFeedback Component & Hook
 *
 * Provides haptic feedback for mobile devices
 * Gracefully degrades on non-supporting platforms
 */

import { useCallback } from 'react';
import { Platform } from '../index';

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error';

interface HapticAPI {
  triggerHaptic: (type: HapticFeedbackType) => void;
  isHapticSupported: () => boolean;
}

export function useHapticFeedback(): HapticAPI {
  const isHapticSupported = useCallback((): boolean => {
    if (Platform.isWeb()) {
      return 'vibrate' in navigator;
    }

    // Native platforms support haptics
    return Platform.isMobile();
  }, []);

  const triggerHaptic = useCallback(
    (type: HapticFeedbackType) => {
      if (!isHapticSupported()) return;

      if (Platform.isWeb()) {
        // Web vibration API fallback
        triggerWebVibration(type);
      } else {
        // Native haptic feedback
        triggerNativeHaptic(type);
      }
    },
    [isHapticSupported]
  );

  return {
    triggerHaptic,
    isHapticSupported,
  };
}

// Web vibration patterns
function triggerWebVibration(type: HapticFeedbackType): void {
  if (!('vibrate' in navigator)) return;

  const patterns: Record<HapticFeedbackType, number | number[]> = {
    light: 50,
    medium: 100,
    heavy: 200,
    selection: [25, 25, 25],
    success: [50, 50, 100],
    warning: [100, 50, 100],
    error: [200, 100, 200],
  };

  const pattern = patterns[type];
  navigator.vibrate(pattern);
}

// Native haptic feedback (through bridge)
async function triggerNativeHaptic(type: HapticFeedbackType): Promise<void> {
  try {
    // Import dynamically to avoid issues on web
    const { useRspeedy } = await import('../../hooks/use-rspeedy');

    // Use RSpeedy bridge to trigger native haptic
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          module: 'HapticFeedback',
          method: 'trigger',
          params: { type },
        })
      );
    }
  } catch (error) {
    console.warn('Failed to trigger native haptic:', error);
  }
}

// Haptic feedback patterns for different interaction types
export const HapticPatterns = {
  // UI Interactions
  buttonPress: 'light' as HapticFeedbackType,
  switchToggle: 'selection' as HapticFeedbackType,
  tabSwitch: 'selection' as HapticFeedbackType,
  modalOpen: 'light' as HapticFeedbackType,
  modalClose: 'light' as HapticFeedbackType,

  // Navigation
  pageTransition: 'light' as HapticFeedbackType,
  backNavigation: 'light' as HapticFeedbackType,

  // Gestures
  swipeAction: 'medium' as HapticFeedbackType,
  pullRefresh: 'selection' as HapticFeedbackType,
  longPress: 'medium' as HapticFeedbackType,

  // Feedback
  success: 'success' as HapticFeedbackType,
  error: 'error' as HapticFeedbackType,
  warning: 'warning' as HapticFeedbackType,

  // Data manipulation
  itemSelect: 'selection' as HapticFeedbackType,
  itemDelete: 'medium' as HapticFeedbackType,
  itemMove: 'light' as HapticFeedbackType,

  // Form interactions
  textInput: 'light' as HapticFeedbackType,
  formSubmit: 'medium' as HapticFeedbackType,
  formError: 'error' as HapticFeedbackType,
};

// HOC for adding haptic feedback to components
export function withHapticFeedback<P extends object>(
  Component: React.ComponentType<P>,
  hapticType: HapticFeedbackType = 'light'
) {
  return function HapticEnhancedComponent(props: P) {
    const { triggerHaptic } = useHapticFeedback();

    const enhancedProps = {
      ...props,
      onPress: (...args: any[]) => {
        triggerHaptic(hapticType);
        (props as any).onPress?.(...args);
      },
      onClick: (...args: any[]) => {
        triggerHaptic(hapticType);
        (props as any).onClick?.(...args);
      },
    };

    return <Component {...enhancedProps} />;
  };
}

// Utility component for custom haptic triggers
export interface HapticTriggerProps {
  children: React.ReactNode;
  type: HapticFeedbackType;
  onTrigger?: () => void;
  disabled?: boolean;
}

export const HapticTrigger: React.FC<HapticTriggerProps> = ({
  children,
  type,
  onTrigger,
  disabled = false,
}) => {
  const { triggerHaptic } = useHapticFeedback();

  const handleTrigger = useCallback(() => {
    if (disabled) return;

    triggerHaptic(type);
    onTrigger?.();
  }, [disabled, triggerHaptic, type, onTrigger]);

  // Clone children and add haptic trigger to interactive elements
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        onPress: (...args: any[]) => {
          handleTrigger();
          child.props.onPress?.(...args);
        },
        onClick: (...args: any[]) => {
          handleTrigger();
          child.props.onClick?.(...args);
        },
      });
    }
    return child;
  });

  return <>{enhancedChildren}</>;
};

// Pre-configured haptic feedback hooks for common patterns
export const useButtonHaptic = () => {
  const { triggerHaptic } = useHapticFeedback();
  return useCallback(() => triggerHaptic(HapticPatterns.buttonPress), [triggerHaptic]);
};

export const useSelectionHaptic = () => {
  const { triggerHaptic } = useHapticFeedback();
  return useCallback(() => triggerHaptic(HapticPatterns.itemSelect), [triggerHaptic]);
};

export const useSuccessHaptic = () => {
  const { triggerHaptic } = useHapticFeedback();
  return useCallback(() => triggerHaptic(HapticPatterns.success), [triggerHaptic]);
};

export const useErrorHaptic = () => {
  const { triggerHaptic } = useHapticFeedback();
  return useCallback(() => triggerHaptic(HapticPatterns.error), [triggerHaptic]);
};
