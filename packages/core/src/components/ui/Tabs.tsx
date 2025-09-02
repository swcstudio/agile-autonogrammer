/**
 * Katalyst Tabs Component
 *
 * Universal tabs component that works across all meta frameworks
 * Uses Katalyst Design System tokens and provides comprehensive accessibility
 */

import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { getComponentTokens } from '../../design-system/tokens';
import { cn, disabledState, focusRing, transition } from '../../utils/cn';

// Get tabs-specific tokens from design system
const tabsTokens = getComponentTokens('tabs');

const tabsVariants = cva(
  [
    // Base styles for tabs container
    'flex w-full',
    transition(),
  ],
  {
    variants: {
      variant: {
        default: 'border-b border-[var(--katalyst-color-border)]',
        pills: 'gap-2 p-1 bg-[var(--katalyst-color-background-secondary)] rounded-lg',
        underline: 'gap-4',
        enclosed:
          'border border-[var(--katalyst-color-border)] rounded-t-lg bg-[var(--katalyst-color-background-secondary)]',
      },
      orientation: {
        horizontal: 'flex-row',
        vertical: 'flex-col',
      },
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      orientation: 'horizontal',
      size: 'default',
    },
  }
);

const tabTriggerVariants = cva(
  [
    // Base styles for tab triggers
    'inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background',
    'transition-all duration-200',
    'disabled:pointer-events-none',
    focusRing(),
    disabledState(),
  ],
  {
    variants: {
      variant: {
        default: [
          'border-b-2 border-transparent px-4 py-2',
          'hover:text-[var(--katalyst-color-text-primary)]',
          'data-[state=active]:border-[var(--katalyst-color-primary)]',
          'data-[state=active]:text-[var(--katalyst-color-text-primary)]',
        ],
        pills: [
          'rounded-md px-3 py-1.5',
          'hover:bg-[var(--katalyst-color-background-tertiary)]',
          'data-[state=active]:bg-[var(--katalyst-color-background)]',
          'data-[state=active]:shadow-sm',
        ],
        underline: [
          'border-b-2 border-transparent pb-2',
          'hover:border-[var(--katalyst-color-border)]',
          'data-[state=active]:border-[var(--katalyst-color-primary)]',
        ],
        enclosed: [
          'border border-transparent rounded-t-md px-4 py-2 -mb-px',
          'hover:bg-[var(--katalyst-color-background-tertiary)]',
          'data-[state=active]:bg-[var(--katalyst-color-background)]',
          'data-[state=active]:border-[var(--katalyst-color-border)]',
          'data-[state=active]:border-b-[var(--katalyst-color-background)]',
        ],
      },
      size: {
        sm: 'h-8 text-xs',
        default: 'h-10 text-sm',
        lg: 'h-11 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const tabContentVariants = cva(
  [
    // Base styles for tab content
    'mt-2',
    'focus:outline-none',
    focusRing(),
  ],
  {
    variants: {
      variant: {
        default: '',
        pills: 'mt-4',
        underline: 'mt-4',
        enclosed: 'border border-t-0 border-[var(--katalyst-color-border)] rounded-b-lg p-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabItem {
  /**
   * Unique value for the tab
   */
  value: string;

  /**
   * Display label for the tab
   */
  label: string;

  /**
   * Content to display when tab is active
   */
  content: React.ReactNode;

  /**
   * Whether the tab is disabled
   */
  disabled?: boolean;

  /**
   * Icon to display in the tab
   */
  icon?: React.ReactNode;

  /**
   * Badge or count to display
   */
  badge?: React.ReactNode;
}

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof tabsVariants> {
  /**
   * Array of tab items
   */
  tabs: TabItem[];

  /**
   * Currently active tab value (controlled)
   */
  value?: string;

  /**
   * Default active tab value (uncontrolled)
   */
  defaultValue?: string;

  /**
   * Callback when tab changes
   */
  onChange?: (value: string) => void;

  /**
   * Additional class name for tab list
   */
  tabListClassName?: string;

  /**
   * Additional class name for tab triggers
   */
  tabTriggerClassName?: string;

  /**
   * Additional class name for tab content
   */
  tabContentClassName?: string;

  /**
   * Whether to lazy load tab content
   */
  lazyLoad?: boolean;

  /**
   * Whether to keep inactive tabs mounted
   */
  keepMounted?: boolean;

  /**
   * Enable keyboard navigation
   */
  keyboardNavigation?: boolean;
}

/**
 * Universal Tabs component for Katalyst React framework
 *
 * Features:
 * - Full design system integration
 * - Multiple variants (default, pills, underline, enclosed)
 * - Horizontal and vertical orientations
 * - Keyboard navigation support
 * - Lazy loading and keep mounted options
 * - Icon and badge support
 * - Comprehensive accessibility
 * - Framework-agnostic (works in Core, Next.js, Remix)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Tabs
 *   tabs={[
 *     { value: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
 *     { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
 *   ]}
 * />
 *
 * // Controlled with pills variant
 * <Tabs
 *   variant="pills"
 *   value={activeTab}
 *   onChange={setActiveTab}
 *   tabs={tabs}
 * />
 * ```
 */
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      tabs,
      value: controlledValue,
      defaultValue,
      onChange,
      variant,
      orientation = 'horizontal',
      size,
      className,
      tabListClassName,
      tabTriggerClassName,
      tabContentClassName,
      lazyLoad = false,
      keepMounted = false,
      keyboardNavigation = true,
      ...props
    },
    ref
  ) => {
    // State for uncontrolled mode
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue || tabs[0]?.value || ''
    );

    // Determine if controlled or uncontrolled
    const isControlled = controlledValue !== undefined;
    const activeValue = isControlled ? controlledValue : uncontrolledValue;

    // Track which tabs have been visited (for lazy loading)
    const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(new Set([activeValue]));

    // Handle tab change
    const handleTabChange = React.useCallback(
      (newValue: string) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }

        // Track visited tabs
        setVisitedTabs((prev) => new Set([...prev, newValue]));

        // Call onChange callback
        onChange?.(newValue);
      },
      [isControlled, onChange]
    );

    // Keyboard navigation
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        if (!keyboardNavigation) return;

        const enabledTabs = tabs.filter((tab) => !tab.disabled);
        const currentEnabledIndex = enabledTabs.findIndex(
          (tab) => tab.value === tabs[currentIndex].value
        );

        let newIndex = currentEnabledIndex;

        switch (event.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            event.preventDefault();
            newIndex = currentEnabledIndex - 1;
            if (newIndex < 0) newIndex = enabledTabs.length - 1;
            break;

          case 'ArrowRight':
          case 'ArrowDown':
            event.preventDefault();
            newIndex = currentEnabledIndex + 1;
            if (newIndex >= enabledTabs.length) newIndex = 0;
            break;

          case 'Home':
            event.preventDefault();
            newIndex = 0;
            break;

          case 'End':
            event.preventDefault();
            newIndex = enabledTabs.length - 1;
            break;

          default:
            return;
        }

        const targetTab = enabledTabs[newIndex];
        if (targetTab) {
          handleTabChange(targetTab.value);
          // Focus the new tab
          const tabElement = event.currentTarget.parentElement?.querySelector(
            `[data-value="${targetTab.value}"]`
          ) as HTMLButtonElement;
          tabElement?.focus();
        }
      },
      [tabs, keyboardNavigation, handleTabChange]
    );

    // Get the active tab
    const activeTab = tabs.find((tab) => tab.value === activeValue);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Tab List */}
        <div
          role="tablist"
          aria-orientation={orientation}
          className={cn(tabsVariants({ variant, orientation, size }), tabListClassName)}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.value === activeValue;

            return (
              <button
                key={tab.value}
                role="tab"
                type="button"
                data-value={tab.value}
                data-state={isActive ? 'active' : 'inactive'}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.value}`}
                disabled={tab.disabled}
                className={cn(tabTriggerVariants({ variant, size }), tabTriggerClassName)}
                onClick={() => handleTabChange(tab.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={isActive ? 0 : -1}
              >
                {tab.icon && <span className="mr-2 inline-flex items-center">{tab.icon}</span>}
                {tab.label}
                {tab.badge && <span className="ml-2 inline-flex items-center">{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        {tabs.map((tab) => {
          const isActive = tab.value === activeValue;
          const shouldRender = isActive || keepMounted || !lazyLoad || visitedTabs.has(tab.value);

          if (!shouldRender) return null;

          return (
            <div
              key={tab.value}
              role="tabpanel"
              id={`tabpanel-${tab.value}`}
              aria-labelledby={tab.value}
              hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                tabContentVariants({ variant }),
                tabContentClassName,
                !isActive && 'hidden'
              )}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    );
  }
);

Tabs.displayName = 'KatalystTabs';

// Compound components for more flexible usage
interface TabsContextValue {
  activeValue: string;
  onTabChange: (value: string) => void;
  variant?: VariantProps<typeof tabsVariants>['variant'];
  size?: VariantProps<typeof tabsVariants>['size'];
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs.Root');
  }
  return context;
};

// Root component
const TabsRoot = React.forwardRef<
  HTMLDivElement,
  Omit<TabsProps, 'tabs'> & { children: React.ReactNode }
>(({ children, value, defaultValue, onChange, variant, size, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : uncontrolledValue;

  const onTabChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onChange?.(newValue);
    },
    [isControlled, onChange]
  );

  return (
    <TabsContext.Provider value={{ activeValue, onTabChange, variant, size }}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});

TabsRoot.displayName = 'Tabs.Root';

// List component
const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof tabsVariants>
>(({ className, variant: variantProp, orientation, size: sizeProp, ...props }, ref) => {
  const { variant: contextVariant, size: contextSize } = useTabsContext();
  const finalVariant = variantProp || contextVariant;
  const finalSize = sizeProp || contextSize;

  return (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        tabsVariants({ variant: finalVariant, orientation, size: finalSize }),
        className
      )}
      {...props}
    />
  );
});

TabsList.displayName = 'Tabs.List';

// Trigger component
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const { activeValue, onTabChange, variant, size } = useTabsContext();
    const isActive = activeValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        data-state={isActive ? 'active' : 'inactive'}
        aria-selected={isActive}
        className={cn(tabTriggerVariants({ variant, size }), className)}
        onClick={() => onTabChange(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'Tabs.Trigger';

// Content component
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { activeValue, variant } = useTabsContext();
    const isActive = activeValue === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn(tabContentVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

TabsContent.displayName = 'Tabs.Content';

// Export compound components
export const TabsCompound = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

export { Tabs, tabsVariants, tabTriggerVariants, tabContentVariants };
export type { TabsProps, TabItem };
