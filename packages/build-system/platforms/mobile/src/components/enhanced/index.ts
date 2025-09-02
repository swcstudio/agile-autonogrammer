/**
 * Enhanced Mobile Components with Re.Pack Integration
 * 
 * Advanced versions of mobile components that leverage Re.Pack features
 */

// Enhanced core components
export { 
  EnhancedTouchableOpacity, 
  EnhancedPressable 
} from './TouchableOpacity';
export type { EnhancedTouchableOpacityProps } from './TouchableOpacity';

export { 
  EnhancedSafeAreaView,
  useEnhancedSafeAreaInsets,
} from './SafeAreaView';
export type { EnhancedSafeAreaViewProps } from './SafeAreaView';

// Re-export original components for backward compatibility
export { TouchableOpacity, Pressable } from '../TouchableOpacity';
export { SafeAreaView, useSafeAreaInsets } from '../SafeAreaView';

// Enhanced component factory
export function createEnhancedComponent<TProps extends object>(
  BaseComponent: React.ComponentType<TProps>,
  enhancements: {
    analytics?: boolean;
    performance?: boolean;
    federation?: boolean;
    adaptive?: boolean;
  } = {}
) {
  return React.memo((props: TProps & {
    analytics?: any;
    performance?: any;
    federation?: any;
    adaptive?: any;
  }) => {
    const enhancedProps = {
      ...props,
      ...(enhancements.analytics && props.analytics ? { analytics: props.analytics } : {}),
      ...(enhancements.performance && props.performance ? { performance: props.performance } : {}),
      ...(enhancements.federation && props.federation ? { federation: props.federation } : {}),
      ...(enhancements.adaptive && props.adaptive ? { adaptive: props.adaptive } : {}),
    };

    return <BaseComponent {...enhancedProps} />;
  });
}

// Enhanced component presets
export const EnhancedComponentPresets = {
  analytics: {
    analytics: true,
    performance: false,
    federation: false,
    adaptive: false,
  },
  
  performance: {
    analytics: false,
    performance: true,
    federation: false,
    adaptive: false,
  },
  
  federation: {
    analytics: false,
    performance: false,
    federation: true,
    adaptive: false,
  },
  
  adaptive: {
    analytics: false,
    performance: false,
    federation: false,
    adaptive: true,
  },
  
  full: {
    analytics: true,
    performance: true,
    federation: true,
    adaptive: true,
  },
};