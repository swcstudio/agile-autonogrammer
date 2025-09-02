import React, { ReactNode, createContext, useContext, useMemo } from 'react';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import { Badge } from '../ui/Badge.tsx';
import { Tabs } from '../ui/Tabs.tsx';
import { Icon } from '../ui/Icon.tsx';

// Re-export individual components for backward compatibility
export { Button, Card, Input, Badge, Tabs, Icon };

interface UITheme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  radius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  scale: 'sm' | 'md' | 'lg';
}

interface UIComponentsConfig {
  theme: UITheme;
  components: {
    button: {
      defaultVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      defaultSize: 'default' | 'sm' | 'lg' | 'icon';
    };
    card: {
      defaultVariant: 'default' | 'destructive' | 'outline' | 'secondary';
      elevation: 'none' | 'sm' | 'md' | 'lg';
    };
    input: {
      defaultVariant: 'default' | 'destructive';
      autoFocus: boolean;
    };
  };
  animations: {
    enabled: boolean;
    duration: 'fast' | 'normal' | 'slow';
  };
}

interface UIComponentsContextValue {
  config: UIComponentsConfig;
  updateConfig: (updates: Partial<UIComponentsConfig>) => void;
  getComponentProps: (componentType: string, overrides?: any) => any;
}

const UIComponentsContext = createContext<UIComponentsContextValue | null>(null);

interface UIComponentsGroupProps {
  children: ReactNode;
  config?: Partial<UIComponentsConfig>;
  className?: string;
}

const defaultUIConfig: UIComponentsConfig = {
  theme: {
    mode: 'dark',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    radius: 'md',
    scale: 'md',
  },
  components: {
    button: {
      defaultVariant: 'default',
      defaultSize: 'default',
    },
    card: {
      defaultVariant: 'default',
      elevation: 'md',
    },
    input: {
      defaultVariant: 'default',
      autoFocus: false,
    },
  },
  animations: {
    enabled: true,
    duration: 'normal',
  },
};

/**
 * UIComponentsGroup - Consolidated UI component system
 * 
 * Groups all UI components (Button, Card, Input, Badge, Tabs, Icon) under a single
 * provider with unified theming, configuration, and prop management.
 * 
 * Benefits:
 * - Centralized UI component configuration
 * - Consistent theming across all components
 * - Reduced bundle size through tree-shaking
 * - Better developer experience with unified APIs
 */
export function UIComponentsGroup({ 
  children, 
  config = {},
  className 
}: UIComponentsGroupProps) {
  const [uiConfig, setUIConfig] = React.useState<UIComponentsConfig>({
    ...defaultUIConfig,
    ...config,
    theme: { ...defaultUIConfig.theme, ...config.theme },
    components: {
      ...defaultUIConfig.components,
      ...config.components,
      button: { ...defaultUIConfig.components.button, ...config.components?.button },
      card: { ...defaultUIConfig.components.card, ...config.components?.card },
      input: { ...defaultUIConfig.components.input, ...config.components?.input },
    },
    animations: { ...defaultUIConfig.animations, ...config.animations },
  });

  const updateConfig = React.useCallback((updates: Partial<UIComponentsConfig>) => {
    setUIConfig(prev => ({
      ...prev,
      ...updates,
      theme: { ...prev.theme, ...updates.theme },
      components: {
        ...prev.components,
        ...updates.components,
        button: { ...prev.components.button, ...updates.components?.button },
        card: { ...prev.components.card, ...updates.components?.card },
        input: { ...prev.components.input, ...updates.components?.input },
      },
      animations: { ...prev.animations, ...updates.animations },
    }));
  }, []);

  const getComponentProps = React.useCallback((componentType: string, overrides: any = {}) => {
    const baseProps = {
      'data-theme': uiConfig.theme.mode,
      'data-scale': uiConfig.theme.scale,
      'data-radius': uiConfig.theme.radius,
      style: {
        '--primary-color': uiConfig.theme.primaryColor,
        '--secondary-color': uiConfig.theme.secondaryColor,
        ...overrides.style,
      },
    };

    switch (componentType) {
      case 'button':
        return {
          ...baseProps,
          variant: overrides.variant || uiConfig.components.button.defaultVariant,
          size: overrides.size || uiConfig.components.button.defaultSize,
          ...overrides,
        };
      case 'card':
        return {
          ...baseProps,
          variant: overrides.variant || uiConfig.components.card.defaultVariant,
          'data-elevation': uiConfig.components.card.elevation,
          ...overrides,
        };
      case 'input':
        return {
          ...baseProps,
          variant: overrides.variant || uiConfig.components.input.defaultVariant,
          autoFocus: overrides.autoFocus ?? uiConfig.components.input.autoFocus,
          ...overrides,
        };
      default:
        return { ...baseProps, ...overrides };
    }
  }, [uiConfig]);

  const contextValue: UIComponentsContextValue = {
    config: uiConfig,
    updateConfig,
    getComponentProps,
  };

  return (
    <UIComponentsContext.Provider value={contextValue}>
      <div 
        className={className}
        data-ui-group="katalyst"
        data-theme={uiConfig.theme.mode}
        data-scale={uiConfig.theme.scale}
        style={{
          '--primary-color': uiConfig.theme.primaryColor,
          '--secondary-color': uiConfig.theme.secondaryColor,
          '--border-radius': uiConfig.theme.radius,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </UIComponentsContext.Provider>
  );
}

export function useUIComponents() {
  const context = useContext(UIComponentsContext);
  if (!context) {
    throw new Error('useUIComponents must be used within a UIComponentsGroup');
  }
  return context;
}

/**
 * Enhanced component wrappers with automatic theming
 */
export function ThemedButton(props: React.ComponentProps<typeof Button>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('button', props);
  return <Button {...themedProps} />;
}

export function ThemedCard(props: React.ComponentProps<typeof Card>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('card', props);
  return <Card {...themedProps} />;
}

export function ThemedInput(props: React.ComponentProps<typeof Input>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('input', props);
  return <Input {...themedProps} />;
}

export function ThemedBadge(props: React.ComponentProps<typeof Badge>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('badge', props);
  return <Badge {...themedProps} />;
}

export function ThemedTabs(props: React.ComponentProps<typeof Tabs>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('tabs', props);
  return <Tabs {...themedProps} />;
}

export function ThemedIcon(props: React.ComponentProps<typeof Icon>) {
  const { getComponentProps } = useUIComponents();
  const themedProps = getComponentProps('icon', props);
  return <Icon {...themedProps} />;
}

/**
 * Component builder utilities
 */
export const UIBuilder = {
  /**
   * Create a custom UI component with automatic theming
   */
  createThemedComponent: <P extends object>(
    component: React.ComponentType<P>,
    componentType: string
  ) => {
    return React.forwardRef<any, P>((props, ref) => {
      const { getComponentProps } = useUIComponents();
      const themedProps = getComponentProps(componentType, props);
      const Component = component as any;
      return <Component ref={ref} {...themedProps} />;
    });
  },

  /**
   * Create a compound component with multiple UI elements
   */
  createCompoundComponent: (components: Record<string, React.ComponentType<any>>) => {
    const CompoundComponent = (props: any) => {
      const { children, ...restProps } = props;
      return <div {...restProps}>{children}</div>;
    };

    Object.entries(components).forEach(([key, Component]) => {
      (CompoundComponent as any)[key] = Component;
    });

    return CompoundComponent;
  },
};

/**
 * Preset configurations for common use cases
 */
export const UIPresets = {
  minimal: {
    theme: {
      mode: 'light' as const,
      primaryColor: '#000000',
      secondaryColor: '#666666',
      radius: 'none' as const,
      scale: 'sm' as const,
    },
    animations: { enabled: false, duration: 'fast' as const },
  },
  
  modern: {
    theme: {
      mode: 'dark' as const,
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      radius: 'lg' as const,
      scale: 'md' as const,
    },
    animations: { enabled: true, duration: 'normal' as const },
  },
  
  playful: {
    theme: {
      mode: 'light' as const,
      primaryColor: '#ec4899',
      secondaryColor: '#f59e0b',
      radius: 'xl' as const,
      scale: 'lg' as const,
    },
    animations: { enabled: true, duration: 'slow' as const },
  },
};

export default UIComponentsGroup;