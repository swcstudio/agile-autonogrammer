# PRD-005: UI/UX Package Migration & Design System Hooks

## Executive Summary

**Objective**: Migrate Katalyst's design system and UI packages to Agile-Programmers with TypeScript Hook architecture, establishing a production-ready component library with 50+ pre-built components, theme system, and accessibility compliance.

**Success Metrics**:
- 50+ UI components fully migrated with hook-based architecture
- WCAG 2.1 AAA accessibility compliance maintained
- Theme system supports light/dark/auto/custom modes
- Component library build size optimized to <120KB gzipped

## UI/UX Package Ecosystem

### Core UI Packages
```
packages/design-system/  - 50+ UI components with theme system
packages/pwa/           - Progressive Web App capabilities
```

### Design System Analysis

**Package: `packages/design-system/`** - Component Library
```typescript
// Current Design System Structure Analysis
// Target: 50+ pre-built components with Katalyst branding
// Features: Themes (light, dark, auto, custom), responsive design
// Accessibility: WCAG 2.1 AAA compliant
// Integration: Framer Motion animations, React 18+ patterns
```

**Available Components Scope**:
```typescript
// Core Components
Button, Card, Input, Badge, Tabs, Modal, Toast

// Data Display  
DataTable, Timeline, Calendar, DatePicker, Charts

// Navigation
Breadcrumb, Pagination, Menu, Sidebar, Navbar

// Layout
Grid, Container, Stack, Flex, Spacer

// Form Components
Form, Select, Checkbox, Radio, Switch, Slider

// Feedback
Alert, Progress, Skeleton, Loading, ErrorBoundary

// Advanced Components
Carousel, Accordion, Dropdown, Tooltip, Popover
```

## Hook-Based Design System Architecture

### Core Design System Hook
```typescript
// packages/hooks/src/ui/useDesignSystem.ts
export interface DesignSystemHook {
  // Theme Management
  theme: ThemeConfig;
  setTheme: (theme: ThemeMode | ThemeConfig) => void;
  availableThemes: ThemeOption[];
  
  // Component Registry
  components: ComponentRegistry;
  registerComponent: (name: string, component: ComponentDefinition) => void;
  getComponent: <T = any>(name: string) => ComponentHook<T>;
  
  // Accessibility
  a11yConfig: AccessibilityConfig;
  setA11yConfig: (config: Partial<AccessibilityConfig>) => void;
  
  // Responsive Design
  breakpoints: BreakpointConfig;
  currentBreakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Animation System
  motionConfig: MotionConfig;
  setMotionPreference: (preference: MotionPreference) => void;
  
  // Performance
  componentStats: ComponentStats;
  optimizeBundle: (components: string[]) => Promise<OptimizationResult>;
}

export function useDesignSystem(config?: DesignSystemConfig): DesignSystemHook {
  const [theme, setThemeState] = useState<ThemeConfig>(() => 
    loadThemeFromStorage() || getDefaultTheme()
  );
  const [components, setComponents] = useState<ComponentRegistry>({});
  const [a11yConfig, setA11yConfig] = useState<AccessibilityConfig>({
    reduceMotion: false,
    highContrast: false,
    screenReader: false,
    focusVisible: true
  });
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('desktop');
  
  // Theme management with system preference detection
  const setTheme = useCallback((newTheme: ThemeMode | ThemeConfig) => {
    let resolvedTheme: ThemeConfig;
    
    if (typeof newTheme === 'string') {
      switch (newTheme) {
        case 'light':
          resolvedTheme = getLightTheme();
          break;
        case 'dark':
          resolvedTheme = getDarkTheme();
          break;
        case 'auto':
          resolvedTheme = getSystemTheme();
          break;
        default:
          resolvedTheme = theme;
      }
    } else {
      resolvedTheme = newTheme;
    }
    
    setThemeState(resolvedTheme);
    saveThemeToStorage(resolvedTheme);
    applyThemeToDocument(resolvedTheme);
  }, [theme]);
  
  // Component registration system
  const registerComponent = useCallback((name: string, component: ComponentDefinition) => {
    setComponents(prev => ({
      ...prev,
      [name]: {
        ...component,
        registeredAt: new Date(),
        version: component.version || '1.0.0'
      }
    }));
  }, []);
  
  const getComponent = useCallback(<T = any>(name: string): ComponentHook<T> => {
    const componentDef = components[name];
    if (!componentDef) {
      throw new Error(`Component "${name}" not found in registry`);
    }
    
    return createComponentHook<T>(componentDef, {
      theme,
      a11yConfig,
      motionConfig: motionConfig
    });
  }, [components, theme, a11yConfig]);
  
  // Responsive design system
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let breakpoint: Breakpoint;
      
      if (width < 768) {
        breakpoint = 'mobile';
      } else if (width < 1024) {
        breakpoint = 'tablet';  
      } else {
        breakpoint = 'desktop';
      }
      
      setCurrentBreakpoint(breakpoint);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Accessibility preference detection
  useEffect(() => {
    const mediaQueries = {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };
    
    const updateA11yConfig = () => {
      setA11yConfig(prev => ({
        ...prev,
        reduceMotion: mediaQueries.reduceMotion.matches,
        highContrast: mediaQueries.highContrast.matches
      }));
    };
    
    updateA11yConfig();
    
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updateA11yConfig);
    });
    
    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updateA11yConfig);
      });
    };
  }, []);
  
  // Load default components
  useEffect(() => {
    loadDefaultComponents().then(defaultComponents => {
      Object.entries(defaultComponents).forEach(([name, component]) => {
        registerComponent(name, component);
      });
    });
  }, [registerComponent]);
  
  return {
    theme,
    setTheme,
    availableThemes: [
      { id: 'light', name: 'Light Theme', preview: getLightTheme().colors.primary },
      { id: 'dark', name: 'Dark Theme', preview: getDarkTheme().colors.primary },
      { id: 'auto', name: 'System', preview: 'auto' }
    ],
    components,
    registerComponent,
    getComponent,
    a11yConfig,
    setA11yConfig,
    breakpoints: config?.breakpoints || getDefaultBreakpoints(),
    currentBreakpoint,
    isMobile: currentBreakpoint === 'mobile',
    isTablet: currentBreakpoint === 'tablet',
    isDesktop: currentBreakpoint === 'desktop',
    motionConfig: a11yConfig.reduceMotion ? getReducedMotionConfig() : getFullMotionConfig(),
    setMotionPreference: (preference) => {
      setA11yConfig(prev => ({ ...prev, reduceMotion: preference === 'reduce' }));
    },
    componentStats: calculateComponentStats(components),
    optimizeBundle: async (componentNames) => {
      return await optimizeBundleForComponents(componentNames, components);
    }
  };
}
```

### Individual Component Hooks
```typescript
// packages/hooks/src/ui/components/useButton.ts
export interface ButtonHook {
  // Button State
  isPressed: boolean;
  isHovered: boolean;
  isFocused: boolean;
  isLoading: boolean;
  
  // Button Actions
  press: () => void;
  release: () => void;
  click: (event: MouseEvent) => void;
  
  // Accessibility
  ariaProps: AriaButtonProps;
  keyboardHandlers: KeyboardEventHandlers;
  
  // Styling
  computedStyles: ComputedButtonStyles;
  themeVariables: ThemeVariables;
  
  // Performance
  renderCount: number;
  lastRenderTime: number;
}

export function useButton(props: ButtonProps): ButtonHook {
  const { theme, a11yConfig } = useDesignSystem();
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(props.loading || false);
  const [renderCount, setRenderCount] = useState(0);
  
  const click = useCallback((event: MouseEvent) => {
    if (props.disabled || isLoading) {
      event.preventDefault();
      return;
    }
    
    // Haptic feedback for supported devices
    if ('vibrate' in navigator && props.hapticFeedback !== false) {
      navigator.vibrate(10);
    }
    
    // Sound feedback if enabled
    if (props.soundFeedback && theme.audio?.buttonClick) {
      playSound(theme.audio.buttonClick);
    }
    
    props.onClick?.(event);
  }, [props, isLoading, theme]);
  
  const press = useCallback(() => {
    setIsPressed(true);
  }, []);
  
  const release = useCallback(() => {
    setIsPressed(false);
  }, []);
  
  // Compute styles based on state and theme
  const computedStyles = useMemo(() => {
    const variant = props.variant || 'primary';
    const size = props.size || 'medium';
    
    const baseStyles = theme.components.button.base;
    const variantStyles = theme.components.button.variants[variant];
    const sizeStyles = theme.components.button.sizes[size];
    
    const stateModifiers = {
      ...(isPressed && theme.components.button.states.pressed),
      ...(isHovered && theme.components.button.states.hovered),
      ...(isFocused && theme.components.button.states.focused),
      ...(props.disabled && theme.components.button.states.disabled),
      ...(isLoading && theme.components.button.states.loading)
    };
    
    return mergeStyles(baseStyles, variantStyles, sizeStyles, stateModifiers);
  }, [theme, props, isPressed, isHovered, isFocused, isLoading]);
  
  // Accessibility properties
  const ariaProps = useMemo(() => ({
    role: 'button',
    'aria-pressed': props.toggle ? isPressed : undefined,
    'aria-disabled': props.disabled || isLoading,
    'aria-busy': isLoading,
    'aria-label': props['aria-label'] || props.children,
    tabIndex: props.disabled ? -1 : 0
  }), [props, isPressed, isLoading]);
  
  // Keyboard event handlers
  const keyboardHandlers = useMemo(() => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setIsPressed(true);
      }
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setIsPressed(false);
        click(event as any);
      }
    }
  }), [click]);
  
  // Performance tracking
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });
  
  return {
    isPressed,
    isHovered,
    isFocused,
    isLoading,
    press,
    release,
    click,
    ariaProps,
    keyboardHandlers,
    computedStyles,
    themeVariables: extractThemeVariables(computedStyles),
    renderCount,
    lastRenderTime: performance.now()
  };
}
```

### Form System Hook
```typescript
// packages/hooks/src/ui/forms/useForm.ts
export interface FormHook<T = any> {
  // Form State
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  
  // Form Actions
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string) => void;
  setFieldTouched: <K extends keyof T>(field: K, touched: boolean) => void;
  validateField: <K extends keyof T>(field: K) => Promise<string | null>;
  validateForm: () => Promise<FormErrors<T>>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  
  // Field Utilities
  getFieldProps: <K extends keyof T>(field: K) => FieldProps<T[K]>;
  getFieldMeta: <K extends keyof T>(field: K) => FieldMeta;
  
  // Accessibility
  getFormProps: () => FormProps;
  getSubmitProps: () => SubmitButtonProps;
}

export function useForm<T extends Record<string, any>>(config: FormConfig<T>): FormHook<T> {
  const { theme, a11yConfig } = useDesignSystem();
  const [values, setValues] = useState<T>(config.initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when value changes
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);
  
  const validateField = useCallback(async <K extends keyof T>(field: K): Promise<string | null> => {
    const validator = config.validate?.[field];
    if (!validator) return null;
    
    try {
      await validator(values[field], values);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, [values, config.validate]);
  
  const validateForm = useCallback(async (): Promise<FormErrors<T>> => {
    const newErrors: FormErrors<T> = {};
    
    if (config.validate) {
      const validationPromises = Object.keys(config.validate).map(async (field) => {
        const error = await validateField(field as keyof T);
        if (error) {
          newErrors[field as keyof T] = error;
        }
      });
      
      await Promise.all(validationPromises);
    }
    
    setErrors(newErrors);
    return newErrors;
  }, [config.validate, validateField]);
  
  const submitForm = useCallback(async () => {
    if (!config.onSubmit) return;
    
    setIsSubmitting(true);
    
    try {
      const formErrors = await validateForm();
      
      if (Object.keys(formErrors).length === 0) {
        await config.onSubmit(values);
        
        if (config.resetOnSuccess !== false) {
          resetForm();
        }
      }
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, config, validateForm]);
  
  const getFieldProps = useCallback(<K extends keyof T>(field: K): FieldProps<T[K]> => ({
    name: String(field),
    value: values[field],
    onChange: (value: T[K]) => setFieldValue(field, value),
    onBlur: () => setFieldTouched(field, true),
    error: errors[field],
    touched: touched[field],
    disabled: isSubmitting,
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${String(field)}-error` : undefined
  }), [values, errors, touched, isSubmitting, setFieldValue, setFieldTouched]);
  
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);
  const isDirty = useMemo(() => 
    JSON.stringify(values) !== JSON.stringify(config.initialValues),
    [values, config.initialValues]
  );
  
  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    setFieldValue,
    setFieldError: (field, error) => setErrors(prev => ({ ...prev, [field]: error })),
    setFieldTouched: (field, touchedValue) => setTouched(prev => ({ ...prev, [field]: touchedValue })),
    validateField,
    validateForm,
    submitForm,
    resetForm: () => {
      setValues(config.initialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    getFieldProps,
    getFieldMeta: (field) => ({
      value: values[field],
      error: errors[field],
      touched: touched[field],
      initialValue: config.initialValues[field]
    }),
    getFormProps: () => ({
      onSubmit: (e: FormEvent) => {
        e.preventDefault();
        submitForm();
      },
      'aria-label': config.formLabel,
      noValidate: true
    }),
    getSubmitProps: () => ({
      type: 'submit' as const,
      disabled: !isValid || isSubmitting,
      'aria-busy': isSubmitting,
      children: isSubmitting ? 'Submitting...' : 'Submit'
    })
  };
}
```

## Theme System & Customization

### Theme Management Hook
```typescript
// packages/hooks/src/ui/theme/useTheme.ts
export interface ThemeHook {
  // Current Theme
  currentTheme: ThemeConfig;
  themeMode: ThemeMode;
  
  // Theme Operations
  setTheme: (theme: ThemeMode | ThemeConfig) => void;
  createCustomTheme: (overrides: ThemeOverrides) => ThemeConfig;
  saveTheme: (name: string, theme: ThemeConfig) => void;
  
  // Theme Utilities
  getThemeValue: (path: string) => any;
  interpolateTheme: (template: string) => string;
  
  // System Integration
  systemTheme: ThemeMode;
  prefersColorScheme: 'light' | 'dark' | null;
  
  // CSS Variables
  cssVariables: Record<string, string>;
  injectThemeStyles: () => void;
}

export function useTheme(): ThemeHook {
  const [currentTheme, setCurrentThemeState] = useState<ThemeConfig>(() => 
    loadSavedTheme() || getDefaultTheme()
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('light');
  
  // System theme detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };
    
    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);
  
  // Auto theme resolution
  useEffect(() => {
    if (themeMode === 'auto') {
      const resolvedTheme = systemTheme === 'dark' ? getDarkTheme() : getLightTheme();
      setCurrentThemeState(resolvedTheme);
    }
  }, [themeMode, systemTheme]);
  
  const setTheme = useCallback((theme: ThemeMode | ThemeConfig) => {
    if (typeof theme === 'string') {
      setThemeMode(theme);
      
      let resolvedTheme: ThemeConfig;
      switch (theme) {
        case 'light':
          resolvedTheme = getLightTheme();
          break;
        case 'dark':
          resolvedTheme = getDarkTheme();
          break;
        case 'auto':
          resolvedTheme = systemTheme === 'dark' ? getDarkTheme() : getLightTheme();
          break;
        default:
          return;
      }
      
      setCurrentThemeState(resolvedTheme);
    } else {
      setThemeMode('custom');
      setCurrentThemeState(theme);
    }
  }, [systemTheme]);
  
  const createCustomTheme = useCallback((overrides: ThemeOverrides): ThemeConfig => {
    const baseTheme = themeMode === 'dark' ? getDarkTheme() : getLightTheme();
    return deepMerge(baseTheme, overrides);
  }, [themeMode]);
  
  const getThemeValue = useCallback((path: string) => {
    return getNestedValue(currentTheme, path);
  }, [currentTheme]);
  
  // Generate CSS variables from theme
  const cssVariables = useMemo(() => {
    const variables: Record<string, string> = {};
    
    const flattenTheme = (obj: any, prefix = '--') => {
      Object.entries(obj).forEach(([key, value]) => {
        const cssKey = prefix + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        if (typeof value === 'object' && value !== null) {
          flattenTheme(value, cssKey + '-');
        } else {
          variables[cssKey] = String(value);
        }
      });
    };
    
    flattenTheme(currentTheme);
    return variables;
  }, [currentTheme]);
  
  const injectThemeStyles = useCallback(() => {
    const existingStyle = document.getElementById('theme-variables');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'theme-variables';
    style.textContent = `
      :root {
        ${Object.entries(cssVariables)
          .map(([key, value]) => `${key}: ${value};`)
          .join('\n        ')}
      }
    `;
    
    document.head.appendChild(style);
  }, [cssVariables]);
  
  // Auto-inject theme styles
  useEffect(() => {
    injectThemeStyles();
  }, [injectThemeStyles]);
  
  return {
    currentTheme,
    themeMode,
    setTheme,
    createCustomTheme,
    saveTheme: (name, theme) => saveThemeToStorage(name, theme),
    getThemeValue,
    interpolateTheme: (template) => interpolateString(template, currentTheme),
    systemTheme,
    prefersColorScheme: systemTheme,
    cssVariables,
    injectThemeStyles
  };
}
```

## Progressive Web App Integration

### PWA Capabilities Hook
```typescript
// packages/hooks/src/ui/pwa/usePWA.ts
export interface PWAHook {
  // Installation
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  
  // Service Worker
  swStatus: ServiceWorkerStatus;
  updateAvailable: boolean;
  updateSW: () => Promise<void>;
  
  // Offline Support
  isOnline: boolean;
  offlineReady: boolean;
  
  // Native Features
  canShare: boolean;
  share: (data: ShareData) => Promise<void>;
  
  // App Lifecycle
  isStandalone: boolean;
  orientation: ScreenOrientation;
  
  // Notifications
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
}

export function usePWA(): PWAHook {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>('loading');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  
  // Install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPrompt(null);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    
    const result = await installPrompt.prompt();
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }
    
    setInstallPrompt(null);
  }, [installPrompt]);
  
  const share = useCallback(async (data: ShareData) => {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
      } catch (error) {
        // Fallback to clipboard
        if (data.url) {
          await navigator.clipboard.writeText(data.url);
        }
      }
    }
  }, []);
  
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, []);
  
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (notificationPermission === 'granted') {
      new Notification(title, options);
    }
  }, [notificationPermission]);
  
  return {
    canInstall,
    isInstalled,
    promptInstall,
    swStatus,
    updateAvailable,
    updateSW: async () => { /* Service worker update logic */ },
    isOnline,
    offlineReady: swStatus === 'ready',
    canShare: 'share' in navigator,
    share,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    orientation: screen.orientation?.type || 'portrait-primary',
    notificationPermission,
    requestNotificationPermission,
    sendNotification
  };
}
```

## Testing Strategy

### Component Testing
```typescript
// tests/ui/components.test.tsx
describe('Design System Components', () => {
  let designSystem: DesignSystemHook;
  
  beforeEach(() => {
    const { result } = renderHook(() => useDesignSystem());
    designSystem = result.current;
  });
  
  it('should render Button with correct styling', () => {
    const ButtonComponent = designSystem.getComponent('Button');
    const { result } = renderHook(() => ButtonComponent.use({
      variant: 'primary',
      size: 'large',
      children: 'Click me'
    }));
    
    expect(result.current.computedStyles.backgroundColor).toBe(designSystem.theme.colors.primary);
    expect(result.current.ariaProps.role).toBe('button');
  });
  
  it('should handle theme switching', async () => {
    designSystem.setTheme('dark');
    
    await waitFor(() => {
      expect(designSystem.theme.colors.background).toBe('#000000');
    });
  });
  
  it('should support accessibility preferences', () => {
    designSystem.setA11yConfig({ reduceMotion: true });
    
    expect(designSystem.motionConfig.duration).toBe(0);
  });
});
```

### Visual Regression Testing
```typescript
// tests/ui/visual.test.tsx
describe('Visual Regression Tests', () => {
  const components = ['Button', 'Card', 'Input', 'Modal'];
  const themes = ['light', 'dark'];
  const sizes = ['small', 'medium', 'large'];
  
  components.forEach(componentName => {
    themes.forEach(theme => {
      sizes.forEach(size => {
        it(`should render ${componentName} with ${theme} theme and ${size} size`, async () => {
          const screenshot = await takeComponentScreenshot(componentName, { theme, size });
          expect(screenshot).toMatchImageSnapshot();
        });
      });
    });
  });
});
```

## Success Criteria

### Component Library Requirements
- [ ] 50+ components fully migrated with hook architecture
- [ ] All components support light/dark/custom themes
- [ ] WCAG 2.1 AAA accessibility compliance maintained
- [ ] Components render consistently across browsers

### Performance Requirements
- [ ] Bundle size optimized to <120KB gzipped
- [ ] Component render time <16ms (60fps)
- [ ] Theme switching completes <100ms
- [ ] Tree-shaking eliminates unused components

### Developer Experience
- [ ] TypeScript definitions for all components
- [ ] Storybook documentation with examples
- [ ] Visual regression testing suite
- [ ] Automated accessibility testing

## Implementation Timeline

**Week 1-2**: Core design system hook and theme management
**Week 3-4**: Individual component hooks (Button, Input, Card, etc.)
**Week 5-6**: Form system and advanced components
**Week 7-8**: PWA capabilities and mobile optimization
**Week 9-10**: Testing, documentation, and performance optimization

## Next Steps

1. **PRD-006**: Developer Tooling & Testing Infrastructure
2. **PRD-007**: Deployment & Edge Computing Strategy
3. **PRD-008**: Security & Performance Monitoring