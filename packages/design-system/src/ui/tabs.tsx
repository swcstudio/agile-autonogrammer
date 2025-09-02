'use client';

/**
 * Next.js Tabs Component - Katalyst Design System Integration
 *
 * This file now imports and re-exports the shared Katalyst Tabs component
 * with additional motion effects and 3D animations for backward compatibility
 */

// Import the shared Katalyst Tabs component
export {
  Tabs as KatalystTabs,
  TabsCompound,
  tabsVariants,
  tabTriggerVariants,
  tabContentVariants,
  type TabsProps,
  type TabItem,
} from '@katalyst-react/shared/components/ui/Tabs';

// Import shared component for enhanced versions
import {
  type TabItem as SharedTabItem,
  Tabs as SharedTabs,
  type TabsProps as SharedTabsProps,
} from '@katalyst-react/shared/components/ui/Tabs';

import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import * as React from 'react';
import { useState } from 'react';

// Legacy Tab type for backward compatibility
type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode | any;
};

// Convert legacy Tab to SharedTabItem
const convertTab = (tab: Tab): SharedTabItem => ({
  value: tab.value,
  label: tab.title,
  content: tab.content,
});

// Motion-enhanced Tabs with 3D effects (legacy compatibility)
export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);
  const [tabs, setTabs] = useState<Tab[]>(propTabs);

  const moveSelectedTabToTop = (idx: number) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className={cn(
          'flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full',
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => {
              moveSelectedTabToTop(idx);
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn('relative px-4 py-2 rounded-full', tabClassName)}
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                className={cn(
                  'absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full ',
                  activeTabClassName
                )}
              />
            )}

            <span className="relative block text-black dark:text-white">{tab.title}</span>
          </button>
        ))}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        hovering={hovering}
        className={cn('mt-32', contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
  hovering,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  const isActive = (tab: Tab) => {
    return tab.value === tabs[0].value;
  };
  return (
    <div className="relative w-full h-full">
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          style={{
            scale: 1 - idx * 0.1,
            top: hovering ? idx * -50 : 0,
            zIndex: -idx,
            opacity: idx < 3 ? 1 - idx * 0.1 : 0,
          }}
          animate={{
            y: isActive(tab) ? [0, 40, 0] : 0,
          }}
          className={cn('w-full h-full absolute top-0 left-0', className)}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
};

// Modern Tabs component using shared Katalyst Tabs
export interface ModernTabsProps extends Omit<SharedTabsProps, 'tabs'> {
  tabs: Tab[];
  enableMotion?: boolean;
}

export const ModernTabs: React.FC<ModernTabsProps> = ({ tabs, enableMotion = false, ...props }) => {
  // Convert legacy tabs to shared format
  const sharedTabs = React.useMemo(() => tabs.map(convertTab), [tabs]);

  return <SharedTabs tabs={sharedTabs} {...props} />;
};

// Default export for convenience
export default SharedTabs;
